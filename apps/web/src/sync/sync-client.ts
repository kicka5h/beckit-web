import type { DocHandle, Repo, StorageId } from "@automerge/automerge-repo";
import { headsAreSame } from "@automerge/automerge-repo/helpers/headsAreSame.js";
import { WebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";

import type { Account, AccountService } from "../account/account.ts";
import type { DeviceSettings } from "../device/device-settings.ts";
import { createListeners } from "../events/listeners.ts";
import { openLibrary } from "../project/library.ts";
import { adoptLibrary, claimLibrary, loadEverything } from "./library-link.ts";

/**
 * Where sync stands, as the header shows it: signed out, offline with changes waiting, syncing,
 * or synced at a time.
 */
export type SyncState =
  | { readonly kind: "signedOut" }
  | { readonly kind: "offline"; readonly waiting: number }
  | { readonly kind: "syncing"; readonly waiting: number }
  | { readonly kind: "synced"; readonly at: number };

/** What a sync client needs. */
export interface SyncClientOptions {
  readonly repo: Repo;
  readonly accounts: AccountService;
  readonly settings: DeviceSettings;
  /** The sync server's https address; the socket uses the same host. */
  readonly serverUrl: string;
}

const SIGNED_OUT: SyncState = { kind: "signedOut" };
/** Idle sockets cost Cloud Run time, so the socket closes after this long without a change. */
const IDLE_MILLISECONDS = 10 * 60_000;
/** Reconnect with a fresh token before the hour-long ID token and Cloud Run's request cap run out. */
const RECONNECT_MILLISECONDS = 50 * 60_000;
const STATUS_MILLISECONDS = 2000;
const RETRY_MILLISECONDS = 5000;

function toSocketUrl(serverUrl: string, token: string): string {
  return `${serverUrl.replace(/^http/, "ws")}/sync?token=${encodeURIComponent(token)}`;
}

/** Whether a document has changes the server has not confirmed it holds. */
function isWaiting(handle: DocHandle<unknown>, server: StorageId): boolean {
  const info = handle.getSyncInfo(server);
  return !info || !headsAreSame(info.lastHeads, handle.heads());
}

/**
 * Keeps this device's documents in sync with the server while someone is signed in and online.
 * It connects on sign-in, coming online and the first change after going idle; disconnects after
 * ten idle minutes; and reconnects with a fresh token every 50 minutes. Writing never waits on it.
 * It is also a React external store (`subscribe`, `state`).
 */
export class SyncClient {
  readonly #options: SyncClientOptions;
  readonly #listeners = createListeners();
  readonly #libraryListeners = new Set<() => void>();
  /** A library change nobody was listening for yet; told to the first listener. */
  #isLibraryChangeUnheard = false;
  #adapter: WebSocketClientAdapter | undefined;
  #state: SyncState = SIGNED_OUT;
  #lastSyncedAt = 0;
  /** The server's storage id, kept once seen so changes made offline can still be counted. */
  #serverStorageId: StorageId | undefined;
  #idleTimer: ReturnType<typeof setTimeout> | undefined;
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: SyncClientOptions) {
    this.#options = options;
  }

  /** Where sync stands now. Stable between changes, as React stores require. */
  get state(): SyncState {
    return this.#state;
  }

  /** Registers a listener called whenever the state changes; returns its remover. */
  readonly subscribe = (listener: () => void): (() => void) => this.#listeners.subscribe(listener);

  /** Starts watching sign-in, the network and edits. Call once. */
  start(): void {
    const { repo, accounts } = this.#options;
    accounts.subscribe(() => {
      this.#reconnect();
    });
    window.addEventListener("online", () => {
      this.#reconnect();
    });
    window.addEventListener("offline", () => {
      this.#disconnect();
    });
    const noteActivity = (): void => {
      this.#noteActivity();
    };
    function watch(handle: DocHandle<unknown>): void {
      handle.on("heads-changed", noteActivity);
    }
    for (const handle of Object.values(repo.handles)) watch(handle);
    repo.on("document", ({ handle }) => {
      watch(handle);
    });
    setInterval(() => {
      this.#updateState();
    }, STATUS_MILLISECONDS);
    this.#reconnect();
  }

  /**
   * Registers a listener called when this device adopts the writer's library, so the app can
   * reopen on it; returns its remover.
   */
  readonly onLibraryChanged = (listener: () => void): (() => void) => {
    this.#libraryListeners.add(listener);
    // The library can arrive before the app has mounted; it still needs to hear about it.
    if (this.#isLibraryChangeUnheard) {
      this.#isLibraryChangeUnheard = false;
      queueMicrotask(listener);
    }
    return () => {
      this.#libraryListeners.delete(listener);
    };
  };

  #reconnect(): void {
    this.#disconnect();
    const account = this.#options.accounts.current();
    if (account && navigator.onLine) void this.#connect(account);
    this.#updateState();
  }

  async #connect(account: Account): Promise<void> {
    const { repo, serverUrl } = this.#options;
    const token = await account.getToken();
    const adapter = new WebSocketClientAdapter(toSocketUrl(serverUrl, token), RETRY_MILLISECONDS);
    this.#adapter = adapter;
    repo.networkSubsystem.addNetworkAdapter(adapter);
    this.#armTimers();
    await adapter.whenReady();
    await this.#linkLibrary(token);
  }

  /** Joins this device to the writer's library and fetches everything in it. */
  async #linkLibrary(token: string): Promise<void> {
    const { repo, settings, serverUrl } = this.#options;
    const local = await openLibrary(repo, settings);
    const writerUrl = await claimLibrary(serverUrl, token, local.url);
    if (await adoptLibrary(repo, settings, local, writerUrl)) this.#announceLibraryChange();
    await loadEverything(repo, await openLibrary(repo, settings));
  }

  #announceLibraryChange(): void {
    this.#isLibraryChangeUnheard = this.#libraryListeners.size === 0;
    for (const listener of this.#libraryListeners) listener();
  }

  #disconnect(): void {
    clearTimeout(this.#idleTimer);
    clearTimeout(this.#reconnectTimer);
    const adapter = this.#adapter;
    if (!adapter) return;
    this.#adapter = undefined;
    adapter.disconnect();
    this.#options.repo.networkSubsystem.removeNetworkAdapter(adapter);
  }

  #armTimers(): void {
    clearTimeout(this.#idleTimer);
    clearTimeout(this.#reconnectTimer);
    this.#idleTimer = setTimeout(() => {
      this.#disconnect();
      this.#updateState();
    }, IDLE_MILLISECONDS);
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnect();
    }, RECONNECT_MILLISECONDS);
  }

  #noteActivity(): void {
    if (this.#adapter) {
      this.#armTimers();
    } else if (this.#options.accounts.current() && navigator.onLine) {
      this.#reconnect();
    }
  }

  /** Counts documents with changes the server hasn't confirmed; 0 before the server is known. */
  #countWaiting(): number {
    const { repo } = this.#options;
    const serverPeer = this.#adapter?.remotePeerId;
    this.#serverStorageId =
      (serverPeer && repo.getStorageIdOfPeer(serverPeer)) ?? this.#serverStorageId;
    const server = this.#serverStorageId;
    if (!server) return 0;
    return Object.values(repo.handles).filter(
      (handle) => handle.isReady() && isWaiting(handle, server),
    ).length;
  }

  #updateState(): void {
    const next = this.#nextState();
    if (JSON.stringify(next) === JSON.stringify(this.#state)) return;
    this.#state = next;
    this.#listeners.notify();
  }

  /**
   * The state to show. "Synced" keeps the time sync last caught up, through idle disconnects,
   * until the next change; a change waiting means "syncing" while online.
   */
  #nextState(): SyncState {
    if (!this.#options.accounts.current()) return SIGNED_OUT;
    const waiting = this.#countWaiting();
    if (!navigator.onLine) return { kind: "offline", waiting };
    const isCaughtUp = waiting === 0 && this.#adapter?.isReady() === true;
    if (isCaughtUp && this.#state.kind !== "synced") this.#lastSyncedAt = Date.now();
    if (waiting === 0 && this.#lastSyncedAt > 0) return { kind: "synced", at: this.#lastSyncedAt };
    return { kind: "syncing", waiting };
  }
}

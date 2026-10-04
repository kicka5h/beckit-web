import { type ReactElement, type SubmitEvent, useState } from "react";

import type { AccountService } from "../account/account.ts";

/** Props for `PassphraseForm`. */
export interface PassphraseFormProps {
  readonly accounts: AccountService;
}

/** The field and button that sign a device in to a self-hosted server with its passphrase. */
export function PassphraseForm({ accounts }: PassphraseFormProps): ReactElement {
  const [passphrase, setPassphrase] = useState("");
  const [problem, setProblem] = useState<string | undefined>();

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    setProblem(undefined);
    accounts.signIn(passphrase).catch((error: unknown) => {
      setProblem(error instanceof Error ? error.message : "Couldn't reach the server.");
    });
  }

  return (
    <form className="list__actions account__form" onSubmit={submit}>
      <input
        className="field"
        type="password"
        autoComplete="current-password"
        aria-label="Server passphrase"
        placeholder="Server passphrase"
        value={passphrase}
        onChange={(event) => {
          setPassphrase(event.currentTarget.value);
        }}
      />
      <button type="submit">Sign in to sync</button>
      {problem && <p className="account__problem">{problem}</p>}
    </form>
  );
}

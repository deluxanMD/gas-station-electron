import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import { ENTITY_LABELS, SHIFT_START_ENTITY } from './constants';
import { useSyncIssues } from './hooks';
import type { SyncIssuesScreenProps } from './types';

// The changes made on this device that the server refused. Each can be sent again (once whatever the server
// objected to is put right) or saved to a file, so nothing that was entered is ever out of reach.
export function SyncIssuesScreen({
  onExit,
}: SyncIssuesScreenProps): JSX.Element {
  const { issues, retrying, retry, saveToFile, notice } = useSyncIssues();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <section className="flex items-center justify-between rounded-xl bg-sidebar px-8 py-6 text-sidebar-foreground">
        <h1 className="text-2xl font-light">Changes that need attention</h1>
        <Button variant="secondary" onClick={onExit}>
          Back to home
        </Button>
      </section>

      <section className="space-y-4 rounded-xl bg-card p-8 shadow-sm">
        <p className="max-w-2xl text-sm text-muted-foreground">
          These changes were saved on this device, but the server did not accept
          them. They are kept safe here. Once the problem is put right, send
          them again, or save them to a file to keep or pass on.
        </p>

        {issues.status === 'loading' ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : null}
        {issues.status === 'error' ? (
          <p role="alert" className="text-sm text-destructive">
            {issues.message}
          </p>
        ) : null}
        {issues.status === 'ready' && issues.entries.length === 0 ? (
          <p>Nothing needs attention.</p>
        ) : null}

        {issues.status === 'ready' && issues.entries.length > 0 ? (
          <>
            <ul className="space-y-3">
              {issues.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-4 rounded-md border border-border px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {ENTITY_LABELS[entry.entity] ?? entry.entity}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Made {formatDateTime(entry.createdAt)}
                    </p>
                    <p className="text-sm text-destructive">
                      {entry.lastError ?? 'The server did not accept it.'}
                    </p>
                    {entry.entity === SHIFT_START_ENTITY ? (
                      <p className="text-sm text-muted-foreground">
                        The rest of this shift is waiting for this one.
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="outline"
                    disabled={retrying.has(entry.id)}
                    aria-label={`Send again: ${ENTITY_LABELS[entry.entity] ?? entry.entity}`}
                    onClick={() => retry(entry.id)}
                  >
                    Send again
                  </Button>
                </li>
              ))}
            </ul>
            <Button variant="secondary" onClick={saveToFile}>
              Save to a file
            </Button>
          </>
        ) : null}

        {notice ? (
          <p role="note" className="text-sm text-muted-foreground">
            {notice}
          </p>
        ) : null}
      </section>
    </div>
  );
}

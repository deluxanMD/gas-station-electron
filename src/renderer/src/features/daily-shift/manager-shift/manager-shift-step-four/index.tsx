import { Fragment, type JSX } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCentsAsAmount } from '@/lib/money';
import { LOTTO_COLUMNS, LOTTO_SECTIONS } from './constants';
import { useLottoReportsForm } from './hooks';
import type { LottoReportsProps } from './types';

const NUMBER_CELL = 'text-right tabular-nums';

export function LottoReports({
  formId,
  onNext,
}: LottoReportsProps): JSX.Element {
  const { form, handleSubmit, calculated, previousDay, net } =
    useLottoReportsForm({ onNext });

  return (
    <Form {...form}>
      <form id={formId} onSubmit={handleSubmit} noValidate>
        <p className="mb-2 text-center font-medium">From OLG Slips</p>
        <div className="rounded-md border border-border">
          <Table className="min-w-[56rem]">
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead className="whitespace-normal">
                  Today Daily Sales (yesterday)
                </TableHead>
                {LOTTO_COLUMNS.map(({ id, heading }) => (
                  <TableHead key={id} className="whitespace-normal">
                    {heading}
                  </TableHead>
                ))}
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Date</TableCell>
                <TableCell className={NUMBER_CELL}>—</TableCell>
                {LOTTO_COLUMNS.map(({ id, shortName }) => (
                  <TableCell key={id}>
                    <FormField
                      control={form.control}
                      name={`dates.${id}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="date"
                              aria-label={`Date - ${shortName}`}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Time of Report</TableCell>
                <TableCell className={NUMBER_CELL}>—</TableCell>
                {LOTTO_COLUMNS.map(({ id, shortName }) => (
                  <TableCell key={id}>
                    <FormField
                      control={form.control}
                      name={`reportTimes.${id}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="time"
                              aria-label={`Time of Report - ${shortName}`}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>

              {LOTTO_SECTIONS.map((section) => (
                <Fragment key={section.title}>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={6} className="font-bold">
                      {section.title}
                    </TableCell>
                  </TableRow>
                  {section.rows.map((row) => {
                    const bold = row.kind === 'subtotal' || row.bold === true;
                    return (
                      <TableRow key={row.key}>
                        <TableCell className={bold ? 'font-bold' : undefined}>
                          {row.label}
                        </TableCell>
                        <TableCell className={NUMBER_CELL}>
                          {formatCentsAsAmount(previousDay[row.key])}
                        </TableCell>
                        {LOTTO_COLUMNS.map(({ id, shortName }) =>
                          row.kind === 'input' ? (
                            <TableCell key={id}>
                              <FormField
                                control={form.control}
                                name={`rows.${row.key}.${id}`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        aria-label={`${section.title} ${row.label} - ${shortName}`}
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        autoComplete="off"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          ) : (
                            <TableCell
                              key={id}
                              className={`${NUMBER_CELL} font-bold`}
                              data-testid={`lotto-${id}-${row.key}`}
                            >
                              {formatCentsAsAmount(calculated[id][row.key])}
                            </TableCell>
                          ),
                        )}
                        <TableCell
                          className={`${NUMBER_CELL} font-bold`}
                          data-testid={`lotto-net-${row.key}`}
                        >
                          {formatCentsAsAmount(net[row.key])}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </form>
    </Form>
  );
}

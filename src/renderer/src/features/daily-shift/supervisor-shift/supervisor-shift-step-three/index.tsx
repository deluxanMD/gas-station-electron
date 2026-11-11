import type { JSX } from 'react';
import { RowField } from '@/components/row-field';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { formatCentsAsAmount } from '@/lib/money';
import { FUEL_DELIVERY_VOLUME_FIELDS } from './constants';
import { useFuelDeliveryForm } from './hooks';
import type { FuelDeliveryProps, FuelDeliveryValues } from './types';

export function FuelDelivery({
  formId,
  onNext,
}: FuelDeliveryProps): JSX.Element {
  const { form, deliveries, addDelivery, removeDelivery, error, handleSubmit } =
    useFuelDeliveryForm({ onNext });

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="max-w-2xl space-y-4"
      >
        <p className="text-base">Add Fuel Delivery or click Next</p>

        {deliveries.length > 0 ? (
          <ul aria-label="Added deliveries" className="space-y-2">
            {deliveries.map((delivery) => (
              <li
                key={delivery.id}
                className="flex items-center justify-between rounded-md border border-border px-4 py-2 text-sm"
              >
                <span>
                  {delivery.date} · BOL {delivery.bolNumber} · REG{' '}
                  {formatCentsAsAmount(delivery.regCentiLitres)} · PREM{' '}
                  {formatCentsAsAmount(delivery.premCentiLitres)} · DIESEL{' '}
                  {formatCentsAsAmount(delivery.dieselCentiLitres)} · Total{' '}
                  {formatCentsAsAmount(delivery.totalCentiLitres)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeDelivery(delivery.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="overflow-hidden rounded-md border border-border">
          <RowField<FuelDeliveryValues>
            name="date"
            label="Date"
            type="date"
            className="border-0 shadow-none"
          />
          <RowField<FuelDeliveryValues>
            name="bolNumber"
            label="BOL #"
            autoComplete="off"
            className="border-0 shadow-none"
          />
          {FUEL_DELIVERY_VOLUME_FIELDS.map(({ name, label }) => (
            <RowField<FuelDeliveryValues>
              key={name}
              name={name}
              label={label}
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              className="border-0 shadow-none"
            />
          ))}
          <RowField<FuelDeliveryValues>
            name="total"
            label="Total"
            highlighted
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            className="border-0 shadow-none"
          />
        </div>

        <Button type="button" variant="secondary" onClick={addDelivery}>
          Add Fuel Delivery
        </Button>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </Form>
  );
}

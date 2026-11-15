import type { JSX } from 'react';
import { RowField } from '@/components/row-field';
import { Form } from '@/components/ui/form';
import { FUEL_DELIVERY_VOLUME_FIELDS } from './constants';
import { useFuelDeliveryForm } from './hooks';
import type { FuelDeliveryProps, FuelDeliveryValues } from './types';

export function FuelDelivery({
  formId,
  onNext,
}: FuelDeliveryProps): JSX.Element {
  const { form, handleSubmit } = useFuelDeliveryForm({ onNext });

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="max-w-2xl space-y-4"
      >
        <p className="text-base">Enter a Fuel Delivery or click Next</p>

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
      </form>
    </Form>
  );
}

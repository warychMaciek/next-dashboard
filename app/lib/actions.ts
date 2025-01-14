'use server';

import { z } from 'zod';
import { db } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string()
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    const client = await db.connect();

    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    });

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await client.sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {
        console.error('Error creating invoice:', error);
        throw new Error('Failed to create invoice.');
    } 

    revalidatePath('/dashboard/invoices');
    client.release();
    redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, formData: FormData) {
    const client = await db.connect();

    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
 
    const amountInCents = amount * 100;

  try {

    await client.sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
    `;
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw new Error('Failed to update invoice.');
  }

    revalidatePath('/dashboard/invoices');
    client.release();
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    const client = await db.connect();

    try {
        await client.sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices');
    } catch (error) {
        console.error('Error deleting invoice:', error);
        throw new Error('Failed to delete invoice.');
    } finally {
        client.release();
    }
}
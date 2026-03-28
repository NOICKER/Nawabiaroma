import assert from 'node:assert/strict';
import test from 'node:test';
import { customerRegisterSchema } from '../controllers/schemas/customerAuth.js';
import { customerAddressUpsertSchema } from '../controllers/schemas/customerAddress.js';

test('customer registration requires phone and a default address', () => {
    const parsed = customerRegisterSchema.safeParse({
        name: 'Ayesha Khan',
        email: 'ayesha@example.com',
        password: 'strongpass123',
        phone: '+91 9876543210',
        addressLabel: 'Home',
        addressLine1: '12 Rose Residency',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        postalCode: '226001',
        country: 'India',
    });

    assert.equal(parsed.success, true);

    if (!parsed.success) {
        return;
    }

    assert.equal(parsed.data.phone, '+91 9876543210');
    assert.equal(parsed.data.addressLabel, 'Home');
    assert.equal(parsed.data.country, 'India');
});

test('customer registration rejects payloads without phone', () => {
    const parsed = customerRegisterSchema.safeParse({
        name: 'Ayesha Khan',
        email: 'ayesha@example.com',
        password: 'strongpass123',
        addressLine1: '12 Rose Residency',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        postalCode: '226001',
        country: 'India',
    });

    assert.equal(parsed.success, false);
});

test('customer address upsert supports labels and default toggles', () => {
    const parsed = customerAddressUpsertSchema.safeParse({
        label: 'Gift to Masi',
        name: 'Sana Begum',
        phone: '+91 9999999999',
        addressLine1: '22 Park Street',
        addressLine2: 'Near Clock Tower',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700016',
        country: 'India',
        setAsDefault: true,
    });

    assert.equal(parsed.success, true);

    if (!parsed.success) {
        return;
    }

    assert.equal(parsed.data.label, 'Gift to Masi');
    assert.equal(parsed.data.setAsDefault, true);
});

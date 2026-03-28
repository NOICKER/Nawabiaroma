export interface AddressFormState {
    label: string;
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    setAsDefault: boolean;
}

export const emptyAddressFormState: AddressFormState = {
    label: '',
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    setAsDefault: false,
};

// Central place to customise the bar's details.
export const BAR = {
  name: 'Rizz',
  tagline: 'Cocktail Bar & Lounge',
  address: '12 Velvet Lane, Downtown',
  hours: '4:00 PM – 2:00 AM',
  phone: '+1 555 0142',
  currency: '$',
  serviceFeeRate: 0.05,
  // Demo PIN for the staff console. Replace with real auth before going live.
  staffPin: '1234',
};

export const money = (n: number) => `${BAR.currency}${n.toFixed(2)}`;

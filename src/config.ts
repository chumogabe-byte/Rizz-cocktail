// Central place to customise the bar's details.
export const BAR = {
  name: 'Rizz',
  tagline: 'Cocktail Bar & Lounge',
  address: '12 Velvet Lane, Downtown',
  hours: '4:00 PM – 2:00 AM',
  phone: '+1 555 0142',
  currency: '$',
  serviceFeeRate: 0.05,
};

export const money = (n: number) => `${BAR.currency}${n.toFixed(2)}`;

/** "7" → "Table 7", "Bar 2" → "Bar 2" */
export const seatLabel = (t?: string) => (!t ? '' : /^\d/.test(t) ? `Table ${t}` : t);

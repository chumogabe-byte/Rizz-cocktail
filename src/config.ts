// Central place to customise the bar's details.
export const BAR = {
  name: 'Rizz',
  tagline: 'Cocktail Bar & Lounge',
  address: '12 Velvet Lane, Downtown',
  hours: '4:00 PM – 2:00 AM',
  phone: '+254 700 000 000',
  currency: 'KSh',
  serviceFeeRate: 0.05,
  // Lipa na M-Pesa Buy Goods till (the server's MPESA_TILL takes precedence when connected)
  mpesaTill: '1750964',
};

export const money = (n: number) =>
  `${BAR.currency} ${n.toLocaleString('en-KE', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

/** "7" → "Table 7", "Bar 2" → "Bar 2" */
export const seatLabel = (t?: string) => (!t ? '' : /^\d/.test(t) ? `Table ${t}` : t);

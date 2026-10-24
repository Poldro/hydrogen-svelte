type Money = { amount: string; currencyCode: string };

export function formatMoney({ amount, currencyCode }: Money): string {
	if (!currencyCode) return amount;
	return new Intl.NumberFormat('it-IT', { style: 'currency', currency: currencyCode }).format(
		Number(amount)
	);
}

const POSITION_KEY = 'pos %';

export function printLogs(results: Record<string, ReturnType<typeof formatLog>>) {
	const medFastest = Math.min(...Object.values(results).map(({ med }) => med));
	const tabledData = Object.entries(results)
		.sort(([, { med: a }], [, { med: b }]) => a - b)
		.reduce(
			(acc, [name, { min, max, med }]) => {
				acc[name] = {
					[POSITION_KEY]: ((medFastest / med) * 100).toFixed(0),
					'avg ms': med.toFixed(4),
					'med ms': med.toFixed(4),
					'min ms': min.toFixed(4),
					'max ms': max.toFixed(4)
				};
				return acc;
			},
			{} as Record<string, Record<string, any>>
		);

	console.table(tabledData);

	return tabledData;
}

export function formatLog(values: Array<number>) {
	return {
		min: min(values),
		max: max(values),
		med: med(values)
	};
}

export function min(values: Array<number>) {
	if (values.length == 0) {
		return 0;
	}

	values = values.map((v) => +v).sort((a, b) => (a - b < 0 ? -1 : 1));

	const limit = Math.floor(values.length / 20);

	return values[limit];
}

export function max(values: Array<number>) {
	if (values.length == 0) {
		return 0;
	}

	values = values.map((v) => +v).sort((a, b) => (a - b < 0 ? -1 : 1));

	const limit = values.length - 1 - Math.floor(values.length / 20);

	return values[limit];
}

export function med(values: Array<number>) {
	if (values.length == 0) {
		return 0;
	}

	values.sort((a, b) => (a - b < 0 ? 1 : -1));

	const half = Math.floor(values.length / 2);

	if (values.length % 2 == 1) {
		return values[half];
	}

	return (values[half - 1] + values[half]) / 2.0;
}

export function fib(n: number) {
	if (n < 0) {
		throw TypeError('Input cannot be negative');
	}

	return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

export function hard() {
	return fib(18);
}

import { describe, expect, test } from '@jest/globals';
import { cellx, transaction } from '../src/cellx';

describe('transaction', () => {
	test('при успешной транзакции срабатывает событие change', () => {
		let a$OnChange = jest.fn();
		let b$OnChange = jest.fn();
		let a$ = cellx(0, { onChange: a$OnChange });
		let b$ = cellx(0, { onChange: b$OnChange });

		try {
			transaction(() => {
				a$.value = 1;
				a$.value = 2;

				transaction(() => {
					b$.value = 1;
					b$.value = 2;
				});

				expect(a$.value).toBe(2);
				expect(b$.value).toBe(2);
			});
		} catch {}

		expect(a$.value).toBe(2);
		expect(b$.value).toBe(2);
		expect(a$OnChange.mock.calls.length).toBe(1);
		expect(b$OnChange.mock.calls.length).toBe(1);
	});

	test('изменения при ошибке откатываются', () => {
		let a$OnChange = jest.fn();
		let b$OnChange = jest.fn();
		let a$ = cellx(0, { onChange: a$OnChange });
		let b$ = cellx(0, { onChange: b$OnChange });

		try {
			transaction(() => {
				a$.value = 1;
				a$.value = 2;

				transaction(() => {
					b$.value = 1;
					b$.value = 2;
				});

				expect(a$.value).toBe(2);
				expect(b$.value).toBe(2);

				throw 1;
			});
		} catch {}

		expect(a$.value).toBe(0);
		expect(b$.value).toBe(0);
		expect(a$OnChange.mock.calls.length).toBe(0);
		expect(b$OnChange.mock.calls.length).toBe(0);
	});
});

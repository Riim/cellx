import { describe, expect, test } from '@jest/globals';
import { cellx, transaction } from '../src/cellx';

describe('transaction', () => {
	test('работает', () => {
		let a$ = cellx(0);
		let b$ = cellx(() => a$.value + 1, { onChange: () => {} });

		transaction(() => {
			a$.value = 1;
			expect(b$.value).toBe(1);
		});

		expect(b$.value).toBe(2);
	});

	test('при успешной транзакции вызывается событие onChange', () => {
		let a$OnChange = jest.fn();
		let b$OnChange = jest.fn();
		let a$ = cellx(0, { onChange: a$OnChange });
		let b$ = cellx(0, { onChange: b$OnChange });

		transaction(() => {
			a$.value = 1;
			a$.value = 2;

			transaction(() => {
				b$.value = 1;
				b$.value = 2;
			});

			expect(a$.value).toBe(2);
			expect(b$.value).toBe(2);
			expect(a$OnChange.mock.calls.length).toBe(0);
			expect(b$OnChange.mock.calls.length).toBe(0);
		});

		expect(a$.value).toBe(2);
		expect(b$.value).toBe(2);
		expect(a$OnChange.mock.calls.length).toBe(1);
		expect(b$OnChange.mock.calls.length).toBe(1);
	});

	test('изменения при ошибке в транзакции откатываются', () => {
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

	test('ожидающие изменения сделанные до транзакции при ошибке в ней не откатываются', () => {
		let a$ = cellx(0);
		let b$ = cellx(() => a$.value + 1, { onChange: () => {} });

		a$.value = 1;

		try {
			transaction(() => {
				a$.value = 2;
				expect(b$.value).toBe(3);
				throw 1;
			});
		} catch {}

		expect(a$.value).toBe(1);
		expect(b$.value).toBe(2);
	});

	test('при ошибке вызывается onFailure-колбэк', () => {
		let a$ = cellx(0);
		let onFailure = jest.fn(() => 'resultOfOnFailure');

		let result = transaction(() => {
			a$.value = 1;
			throw 1;
		}, onFailure);

		expect(a$.value).toBe(0);
		expect(onFailure).toHaveBeenCalledTimes(1);
		expect(result).toBe('resultOfOnFailure');
	});
});

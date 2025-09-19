export function isPromiseLike<T = any>(value: any): value is Promise<T> {
	return !!value && typeof value['then'] == 'function';
}

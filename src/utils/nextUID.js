var uidCounter = 0;

/**
 * @typesign () -> string;
 */
export default function nextUID() {
	return String(++uidCounter);
}

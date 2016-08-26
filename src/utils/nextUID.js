var uidCounter = 0;

/**
 * @typesign () -> string;
 */
function nextUID() {
	return String(++uidCounter);
}

export default nextUID;

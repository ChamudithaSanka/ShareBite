const coordinatesFromValue = (value) => {
	if (value && typeof value === 'object') {
		const latitude = Number(value.latitude);
		const longitude = Number(value.longitude);
		return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
	}

	if (typeof value !== 'string') return null;

	const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
	if (!match) return null;

	const latitude = Number(match[1]);
	const longitude = Number(match[2]);
	return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
};

const calculateDistance = (from, to) => {
	const start = coordinatesFromValue(from);
	const end = coordinatesFromValue(to);
	if (!start || !end) return null;

	const toRadians = (value) => (value * Math.PI) / 180;
	const latitudeDelta = toRadians(end.latitude - start.latitude);
	const longitudeDelta = toRadians(end.longitude - start.longitude);
	const latitude = toRadians(start.latitude);
	const endLatitude = toRadians(end.latitude);
	const haversine = Math.sin(latitudeDelta / 2) ** 2
		+ Math.cos(latitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

	return `${(6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))).toFixed(1)} km`;
};

export { calculateDistance, coordinatesFromValue };

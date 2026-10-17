export const requestJson = async (path, options = {}) => {
    const response = await fetch(path, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    if (response.status === 204) return null;

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(payload.error?.message || 'Nao foi possivel carregar os dados.');
        error.payload = payload;
        error.status = response.status;
        throw error;
    }

    return payload.data;
};

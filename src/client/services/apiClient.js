let unauthorizedHandler = () => {};

export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = typeof handler === 'function' ? handler : () => {};
};

export const reportUnauthorized = (path, error) => {
    try {
        unauthorizedHandler({ path, error });
    } catch (_handlerError) {
        // A falha de navegação não deve ocultar o erro HTTP original.
    }
};

export const requestJson = async (path, options = {}) => {
    const response = await fetch(path, {
        credentials: 'same-origin',
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
        if (response.status === 401) {
            reportUnauthorized(path, error);
        }
        throw error;
    }

    return payload.data;
};

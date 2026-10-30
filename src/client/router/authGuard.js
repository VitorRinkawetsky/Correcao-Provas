export const createAuthGuard = (authStore) => async (to) => {
    await authStore.restoreSession({ force: authStore.isAuthenticated.value });

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
    const guestOnly = to.matched.some((record) => record.meta.guestOnly);

    if (requiresAuth && !authStore.isAuthenticated.value) {
        return {
            name: 'login',
            query: { redirect: to.fullPath }
        };
    }

    if (guestOnly && authStore.isAuthenticated.value) {
        return { name: 'home' };
    }

    return undefined;
};

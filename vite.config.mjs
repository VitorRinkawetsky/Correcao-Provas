import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    base: '/Correcao-Provas/',
    plugins: [vue()],
    server: {
        host: '127.0.0.1',
        port: 5173
    },
    preview: {
        host: '127.0.0.1',
        port: 4173
    },
    test: {
        environment: 'node'
    }
});

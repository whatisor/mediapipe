import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    base: '/mediapipe/',
    plugins: [react()],
    build: {
        rollupOptions: {
            external: ['@mediapipe/tasks-vision'],
            output: {
                globals: {
                    '@mediapipe/tasks-vision': 'MediaPipeTasksVision'
                }
            }
        }
    },
    optimizeDeps: {
        exclude: ['@mediapipe/tasks-vision']
    }
});

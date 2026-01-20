module.exports = {
    root: true,
    env: {
        browser: true,
        node: true,
        es2022: true
    },
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react', 'react-hooks', 'unused-imports'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
    ],
    settings: {
        react: {
            version: 'detect'
        }
    },
    rules: {
        'react/react-in-jsx-scope': 'off',
        'unused-imports/no-unused-imports': 'error',
        'react/no-unescaped-entities': 'warn',
        '@typescript-eslint/no-unused-vars': [
            'warn',
            { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
        ],
        '@typescript-eslint/no-explicit-any': 'warn'
    },
    ignorePatterns: ['dist', 'build', 'node_modules', '.vite', 'coverage']
};

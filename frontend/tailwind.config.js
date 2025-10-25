/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Background colors
                'bg-primary': 'var(--bg-primary)',
                'bg-secondary': 'var(--bg-secondary)',
                'bg-tertiary': 'var(--bg-tertiary)',
                'bg-quaternary': 'var(--bg-quaternary)',

                // Text colors
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'text-tertiary': 'var(--text-tertiary)',
                'text-muted': 'var(--text-muted)',

                // Border colors
                'border-primary': 'var(--border-primary)',
                'border-secondary': 'var(--border-secondary)',
                'border-accent': 'var(--border-accent)',

                // Card colors
                'card-bg': 'var(--card-bg)',
                'card-border': 'var(--card-border)',
                'card-shadow': 'var(--card-shadow)',

                // Accent colors
                'accent-blue': 'var(--accent-blue)',
                'accent-green': 'var(--accent-green)',
                'accent-red': 'var(--accent-red)',
                'accent-yellow': 'var(--accent-yellow)',
                'accent-purple': 'var(--accent-purple)',

                // Interactive states
                'hover-bg': 'var(--hover-bg)',
                'active-bg': 'var(--active-bg)',
                'focus-ring': 'var(--focus-ring)',

                // Status colors
                'status-success': 'var(--status-success)',
                'status-warning': 'var(--status-warning)',
                'status-error': 'var(--status-error)',
                'status-info': 'var(--status-info)',

                // Table colors
                'table-header-bg': 'var(--table-header-bg)',
                'table-row-hover': 'var(--table-row-hover)',
                'table-border': 'var(--table-border)',
            },
        },
    },
    plugins: [],
}

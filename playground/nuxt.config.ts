export default defineNuxtConfig({

	modules: ['../src/module'],
	ssr: false,
	imports: {
		autoImport: true,
	},
	devtools: { enabled: false },	compatibilityDate: '2025-07-19',
	nitro: {
		storage: {
			dedicated: {
				driver: 'fs',
				base: './playground/db',
			},
		},
	},

	uncsrf: {
		storage: 'dedicated',
	},
})

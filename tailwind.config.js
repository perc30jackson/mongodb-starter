module.exports = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/gradients.ts'
  ],
  theme: {
  	extend: {
  		colors: {
  			// Your custom color palette
  			'space_cadet': { 
  				DEFAULT: '#2b2d42', 
  				100: '#08090d', 
  				200: '#11121a', 
  				300: '#191b27', 
  				400: '#222334', 
  				500: '#2b2d42', 
  				600: '#4a4d72', 
  				700: '#6d71a0', 
  				800: '#9da0bf', 
  				900: '#ced0df' 
  			}, 
  			'cool_gray': { 
  				DEFAULT: '#8d99ae', 
  				100: '#1a1e25', 
  				200: '#343c4a', 
  				300: '#4f5b6f', 
  				400: '#697994', 
  				500: '#8d99ae', 
  				600: '#a4aebf', 
  				700: '#bbc2cf', 
  				800: '#d2d6df', 
  				900: '#e8ebef' 
  			}, 
  			'anti-flash_white': { 
  				DEFAULT: '#edf2f4', 
  				100: '#24353b', 
  				200: '#496a77', 
  				300: '#759bab', 
  				400: '#b1c6cf', 
  				500: '#edf2f4', 
  				600: '#f0f4f6', 
  				700: '#f4f7f8', 
  				800: '#f7fafa', 
  				900: '#fbfcfd' 
  			}, 
  			'red_(pantone)': { 
  				DEFAULT: '#ef233c', 
  				100: '#330409', 
  				200: '#660813', 
  				300: '#9a0c1c', 
  				400: '#cd0f26', 
  				500: '#ef233c', 
  				600: '#f25063', 
  				700: '#f57c8a', 
  				800: '#f8a8b1', 
  				900: '#fcd3d8' 
  			}, 
  			'fire_engine_red': { 
  				DEFAULT: '#d90429', 
  				100: '#2b0108', 
  				200: '#560210', 
  				300: '#810318', 
  				400: '#ac0420', 
  				500: '#d90429', 
  				600: '#fa1b40', 
  				700: '#fc5470', 
  				800: '#fd8da0', 
  				900: '#fec6cf' 
  			},
  			// Legacy dark accent colors (to be phased out)
  			'dark-accent-1': '#111111',
  			'dark-accent-2': '#333333',
  			'dark-accent-3': '#444444',
  			'dark-accent-5': '#888888',
  			// Shadcn theme variables mapped to CSS custom properties
  			background: 'rgb(var(--color-background-100))',
  			foreground: 'rgb(var(--color-text-100))',
  			card: {
  				DEFAULT: 'rgb(var(--color-card-100))',
  				foreground: 'rgb(var(--color-text-100))'
  			},
  			popover: {
  				DEFAULT: 'rgb(var(--color-background-100))',
  				foreground: 'rgb(var(--color-text-100))'
  			},
  			primary: {
  				DEFAULT: 'rgb(var(--color-primary-100))',
  				foreground: 'rgb(var(--color-background-100))'
  			},
  			secondary: {
  				DEFAULT: 'rgb(var(--color-background-90))',
  				foreground: 'rgb(var(--color-text-100))'
  			},
  			muted: {
  				DEFAULT: 'rgb(var(--color-background-90))',
  				foreground: 'rgb(var(--color-text-300))'
  			},
			accent: {
				DEFAULT: 'rgb(var(--color-primary-10))',
				foreground: 'rgb(var(--color-primary-100))',
				dark: 'rgb(var(--color-accent-dark))'
			},
  			destructive: {
  				DEFAULT: 'rgb(var(--color-error-200))',
  				foreground: 'rgb(var(--color-background-100))'
  			},
  			border: 'rgb(var(--color-border-200))',
  			input: 'rgb(var(--color-border-200))',
  			ring: 'rgb(var(--color-primary-100))',
  			chart: {
  				'1': 'rgb(var(--color-primary-100))',
  				'2': 'rgb(var(--color-primary-200))',
  				'3': 'rgb(var(--color-primary-300))',
  				'4': 'rgb(var(--color-primary-400))',
  				'5': 'rgb(var(--color-primary-500))'
  			},
  			// Direct color mappings from CSS
  			'color-primary': {
  				10: 'rgb(var(--color-primary-10))',
  				20: 'rgb(var(--color-primary-20))',
  				30: 'rgb(var(--color-primary-30))',
  				40: 'rgb(var(--color-primary-40))',
  				50: 'rgb(var(--color-primary-50))',
  				60: 'rgb(var(--color-primary-60))',
  				70: 'rgb(var(--color-primary-70))',
  				80: 'rgb(var(--color-primary-80))',
  				90: 'rgb(var(--color-primary-90))',
  				100: 'rgb(var(--color-primary-100))',
  				200: 'rgb(var(--color-primary-200))',
  				300: 'rgb(var(--color-primary-300))',
  				400: 'rgb(var(--color-primary-400))',
  				500: 'rgb(var(--color-primary-500))',
  				600: 'rgb(var(--color-primary-600))',
  				700: 'rgb(var(--color-primary-700))',
  				800: 'rgb(var(--color-primary-800))',
  				900: 'rgb(var(--color-primary-900))'
  			},
  			'color-background': {
  				100: 'rgb(var(--color-background-100))',
  				90: 'rgb(var(--color-background-90))',
  				80: 'rgb(var(--color-background-80))'
  			},
  			'color-text': {
  				100: 'rgb(var(--color-text-100))',
  				200: 'rgb(var(--color-text-200))',
  				300: 'rgb(var(--color-text-300))',
  				350: 'rgb(var(--color-text-350))',
  				400: 'rgb(var(--color-text-400))'
  			},
  			'color-border': {
  				100: 'rgb(var(--color-border-100))',
  				200: 'rgb(var(--color-border-200))',
  				300: 'rgb(var(--color-border-300))',
  				400: 'rgb(var(--color-border-400))'
  			},
  			'color-error': {
  				10: 'rgb(var(--color-error-10))',
  				20: 'rgb(var(--color-error-20))',
  				30: 'rgb(var(--color-error-30))',
  				100: 'rgb(var(--color-error-100))',
  				200: 'rgb(var(--color-error-200))',
  				500: 'rgb(var(--color-error-500))'
  			}
  		},

  	}
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography'), require("tailwindcss-animate")]
};

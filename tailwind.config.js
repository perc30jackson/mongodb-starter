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
  			// Shadcn theme variables
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography'), require("tailwindcss-animate")]
};

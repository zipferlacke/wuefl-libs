const farben = {
    primary:   'var(--clr-primary)',
    secondary: 'var(--clr-secondary)',
    danger:    'var(--clr-danger)',
    warning:   'var(--clr-warning)',
    success:   'var(--clr-success)',
    info:      'var(--clr-info)',
    neutral:   'var(--clr-neutral)',
};

const root = document.documentElement;

for (const [name, value] of Object.entries(farben)) {
    for (let shade = 0; shade <= 1000; shade += 25) {
        const light = shade / 10;           // 0% bis 100%
        const dark  = (1000 - shade) / 10;  // invertiert

        root.style.setProperty(
            `--clr-${name}-${shade}`,
            `light-dark(hsl(from ${value} h s ${dark}%), hsl(from ${value} h s ${light}%))`
        );
    }
}
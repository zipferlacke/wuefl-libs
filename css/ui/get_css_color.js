export function getCssColor(variable) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none';
    el.style.color = `var(${variable})`;
    document.body.appendChild(el);
    const color = getComputedStyle(el).color;
    el.remove();
    return color;
}
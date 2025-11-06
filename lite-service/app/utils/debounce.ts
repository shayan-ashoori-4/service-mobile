function debounce(func: (...args: any) => any, delay: number) {
  let timer: NodeJS.Timeout;
  return function (...args: any) {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

export { debounce };

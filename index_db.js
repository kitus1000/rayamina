const allowedViews = ["/dashboard", "/dashboard/semana", "/dashboard/chat"];
const href = "/dashboard/operacion/reportes-diarios";

const isAllowed = allowedViews.some(av => {
    const match1 = (href === av);
    const match2 = (href !== '/dashboard' && href.startsWith(av));
    console.log(`Checking av='${av}' against href='${href}'. match1=${match1}, match2=${match2}`);
    return match1 || match2;
});
console.log("FINAL:", isAllowed);

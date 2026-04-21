/* Redirects for React Router SPA */
/* All requests that do not exist as files should point to index.html */
/* This is essential for Netlify and other SPA hosts */
/* See https://docs.netlify.com/routing/redirects/rewrites-proxies/#history-pushstate-and-single-page-apps */

/*
  Comment: On Netlify, we create a file named `_redirects` in the build directory.
  Since Vite puts everything in `public` into the `dist` folder, we create it in `public`.
*/

/* Netlify Syntax: */
/* /*  /index.html  200 */
/* But we don't use comments in the real file. */

/*  Real file content: */
/*  /*    /index.html   200  */

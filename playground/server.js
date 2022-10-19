export default (event) => {
  const response = new Response(
    `<div>Hello from ${new URL(event.request.url).pathname}</div>`,
    {
      headers: {
        "content-type": "text/html",
      },
    }
  );
  return response;
};

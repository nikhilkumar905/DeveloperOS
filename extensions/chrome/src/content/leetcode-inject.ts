// Intercept Fetch
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);
  try {
    const url = typeof args[0] === 'string' ? args[0] : ((args[0] as any)?.url || (args[0] as any)?.href || '');
    if (url && typeof url === 'string') {
      if (url.includes('/submissions/detail/') && url.includes('/check/')) {
        const clone = response.clone();
        clone.json().then(data => {
          if (data && data.state === 'SUCCESS') {
            window.postMessage({ type: 'LEETCODE_SUBMISSION', data }, '*');
          }
        }).catch(() => {});
      } else if (url.includes('graphql')) {
        const clone = response.clone();
        clone.json().then(data => {
          if (data?.data?.submissionDetails) {
            const details = data.data.submissionDetails;
            if (details.statusDisplay === 'Accepted' || details.statusCode === 10) {
              window.postMessage({ type: 'LEETCODE_SUBMISSION', data: { status_msg: 'Accepted' } }, '*');
            } else if (
              details.statusDisplay === 'Wrong Answer' ||
              details.statusDisplay === 'Runtime Error' ||
              details.statusDisplay === 'Time Limit Exceeded' ||
              details.statusDisplay === 'Compile Error'
            ) {
              window.postMessage({ type: 'LEETCODE_SUBMISSION', data: { status_msg: details.statusDisplay } }, '*');
            }
          }
        }).catch(() => {});
      }
    }
  } catch (e) {}
  return response;
};

// Intercept XMLHttpRequest
const XHR = XMLHttpRequest.prototype;
const originalOpen = XHR.open;
const originalSend = XHR.send;

XHR.open = function (method: string, url: string | URL) {
  (this as any)._url = typeof url === 'string' ? url : (url as URL).href;
  return originalOpen.apply(this, arguments as any);
};

XHR.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
  this.addEventListener('load', function () {
    const url = (this as any)._url;
    if (url && typeof url === 'string') {
      if (url.includes('/submissions/detail/') && url.includes('/check/')) {
        try {
          const data = JSON.parse(this.responseText);
          if (data && data.state === 'SUCCESS') {
            window.postMessage({ type: 'LEETCODE_SUBMISSION', data }, '*');
          }
        } catch (e) {}
      } else if (url.includes('graphql')) {
        try {
          const data = JSON.parse(this.responseText);
          if (data?.data?.submissionDetails) {
            const details = data.data.submissionDetails;
            if (details.statusDisplay === 'Accepted' || details.statusCode === 10) {
              window.postMessage({ type: 'LEETCODE_SUBMISSION', data: { status_msg: 'Accepted' } }, '*');
            } else if (
              details.statusDisplay === 'Wrong Answer' ||
              details.statusDisplay === 'Runtime Error' ||
              details.statusDisplay === 'Time Limit Exceeded' ||
              details.statusDisplay === 'Compile Error'
            ) {
              window.postMessage({ type: 'LEETCODE_SUBMISSION', data: { status_msg: details.statusDisplay } }, '*');
            }
          }
        } catch (e) {}
      }
    }
  });
  return originalSend.apply(this, arguments as any);
};

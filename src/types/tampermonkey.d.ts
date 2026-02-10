// Tampermonkey API type declarations

declare function GM_setValue(key: string, value: any): void;
declare function GM_getValue(key: string, defaultValue?: any): any;
declare function GM_xmlhttpRequest(details: GMXMLHttpRequestDetails): void;
declare function GM_registerMenuCommand(caption: string, callback: () => void): string;

interface GMXMLHttpRequestDetails {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  url: string;
  headers?: Record<string, string>;
  data?: string;
  timeout?: number;
  onload?: (response: GMXMLHttpRequestResponse) => void;
  onerror?: (response: GMXMLHttpRequestResponse) => void;
  ontimeout?: () => void;
}

interface GMXMLHttpRequestResponse {
  status: number;
  statusText: string;
  responseText: string;
  responseHeaders: string;
  finalUrl: string;
}

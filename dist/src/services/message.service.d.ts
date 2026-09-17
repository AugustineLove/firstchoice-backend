interface SendMessagePayload {
    messageTo: string | string[];
    messageFrom: string;
    message: string;
}
export declare function sendCustomerMessage(payload: SendMessagePayload): Promise<boolean>;
export {};

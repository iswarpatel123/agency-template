import { Client, ExecutionMethod, Functions } from "appwrite";

const client = new Client();

const functions = new Functions(client);

client
    .setEndpoint(import.meta.env.PUBLIC_APPWRITE_ENDPOINT || '')
    .setProject(import.meta.env.PUBLIC_APPWRITE_PROJECT || '');

export enum FunctionPath {
    CHECKOUT = '/checkout',
    CLIENT_TOKEN = '/client_token',
}

export async function executeFunction(body: string, path: FunctionPath): Promise<any> {
    const promise = functions.createExecution(
        import.meta.env.PUBLIC_APPWRITE_FUNCTION_ID || '',  // functionId
        body,  // body (optional)
        false,  // async (optional)
        path,  // path (enum value)
        ExecutionMethod.GET,  // method (optional)
        {} // headers (optional)
    );

    // Return the raw response from Appwrite execution
    return promise;
}

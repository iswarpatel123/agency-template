import { Client, ExecutionMethod, Functions } from "appwrite";
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client();

const functions = new Functions(client);

client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT || '');

export enum FunctionPath {
    CHECKOUT = '/checkout',
    CLIENT_TOKEN = '/client_token',
}

export async function executeFunction(body: string, path: FunctionPath): Promise<any> {
    const promise = functions.createExecution(
        process.env.APPWRITE_FUNCTION_ID || '',  // functionId
        body,  // body (optional)
        false,  // async (optional)
        path,  // path (enum value)
        ExecutionMethod.GET,  // method (optional)
        {} // headers (optional)
    );

    return promise.then(function (response) {
        return response; // Success
    }).catch(function (error) {
        throw error; // Failure
    });
}
import { Client, ExecutionMethod, Functions } from "appwrite";
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client();

const functions = new Functions(client);

client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT || '');

async function executeFunction(body: string, path: string): Promise<any> {
    const promise = functions.createExecution(
        process.env.APPWRITE_FUNCTION_ID || '',  // functionId
        body,  // body (optional)
        false,  // async (optional)
        path,  // path (optional)
        ExecutionMethod.GET,  // method (optional)
        {} // headers (optional)
    );

    return promise.then(function (response) {
        return response; // Success
    }).catch(function (error) {
        throw error; // Failure
    });
}
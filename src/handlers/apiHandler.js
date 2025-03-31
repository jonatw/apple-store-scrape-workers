/**
 * API 請求處理器
 * 處理所有 API 請求
 */

import { corsify } from '../middleware/cors';
import { ApiError } from '../utils/error';
import { logger } from '../utils/logger';
import { getIPhoneData, getIPadData, getExchangeRateData, getAllData } from '../storage/kv';
import { updateData, getDataStats } from '../services/dataService';

/**
 * 處理更新請求
 * @param {Request} request - HTTP 請求
 * @param {Object} param1 - 環境和上下文
 * @returns {Promise<Response>} - HTTP 響應
 */
export async function handleApiUpdate(request, { env, ctx }) {
  try {
    logger.info('Handling API update request');
    
    if (request.method !== 'POST') {
      logger.warn(`Invalid method for update API: ${request.method}`);
      throw new ApiError('Method not allowed. Use POST.', 405);
    }
    
    const result = await updateData(env, ctx);
    
    if (!result.success) {
      logger.error('Update failed', { error: result.error });
      throw new ApiError(`Update failed: ${result.error}`, 500);
    }
    
    return corsify(new Response(JSON.stringify({
      message: 'Data update completed successfully',
      timestamp: result.timestamp,
      data: result.data
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  } catch (error) {
    logger.error('Error handling API update request', error);
    
    if (error instanceof ApiError) {
      return corsify(new Response(JSON.stringify({
        error: error.name,
        message: error.message
      }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    return corsify(new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * 處理數據請求
 * @param {Request} request - HTTP 請求
 * @param {Object} param1 - 環境和上下文
 * @returns {Promise<Response>} - HTTP 響應
 */
export async function handleApiData(request, { env }) {
  try {
    logger.info('Handling API data request for local development');
    
    if (request.method !== 'GET') {
      logger.warn(`Invalid method for data API: ${request.method}`);
      throw new ApiError('Method not allowed. Use GET.', 405);
    }
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    let data;
    
    if (path.endsWith('/all.json')) {
      data = await getAllData(env);
    } else if (path.endsWith('/iphone.json')) {
      data = await getIPhoneData(env);
    } else if (path.endsWith('/ipad.json')) {
      data = await getIPadData(env);
    } else if (path.endsWith('/exchange-rate.json')) {
      data = await getExchangeRateData(env);
    } else {
      throw new ApiError('Not found', 404);
    }
    
    if (!data) {
      throw new ApiError('Data not found. Try triggering an update first.', 404);
    }
    
    return corsify(new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    }));
  } catch (error) {
    logger.error('Error handling API data request', error);
    
    if (error instanceof ApiError) {
      return corsify(new Response(JSON.stringify({
        error: error.name,
        message: error.message
      }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    return corsify(new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * 處理統計數據請求
 * @param {Request} request - HTTP 請求
 * @param {Object} param1 - 環境和上下文
 * @returns {Promise<Response>} - HTTP 響應
 */
export async function handleApiStats(request, { env }) {
  try {
    logger.info('Handling API stats request');
    
    if (request.method !== 'GET') {
      logger.warn(`Invalid method for stats API: ${request.method}`);
      throw new ApiError('Method not allowed. Use GET.', 405);
    }
    
    const stats = await getDataStats(env);
    
    return corsify(new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  } catch (error) {
    logger.error('Error handling API stats request', error);
    
    if (error instanceof ApiError) {
      return corsify(new Response(JSON.stringify({
        error: error.name,
        message: error.message
      }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    return corsify(new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

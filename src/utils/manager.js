/**
 *
 *
 * axios.request(config)
 *
 * axios.get(url[, config])
 *
 * axios.delete(url[, config])
 *
 * axios.head(url[, config])
 *
 * axios.options(url[, config])
 *
 * axios.post(url[, data[, config]])
 *
 * axios.put(url[, data[, config]])
 *
 * axios.patch(url[, data[, config]])
 *
 */

import querystring from 'querystring'
import { http } from './http'
import { camel2Words } from './base'

export class UnknownRpcMethodException {
  constructor (method) {
    this.method = method
  }
}

export class UnknownCsrfMethodException {
  constructor (method) {
    this.method = method
  }
}

export class Manager {
  constructor (res, apiVer) {
    this.resource = res
    if (apiVer) {
      this.apiVersion = apiVer
    } else {
      this.apiVersion = 'v1'
    }
  }

  contextPath (ctx) {
    let path = '/' + this.apiVersion + '/'
    for (let i = 0, len = ctx.length; i < len; i++) {
      path += `${ctx[i][0]}/${ctx[i][1]}/`
    }
    return path
  }

  get (idstr, params, ctx = []) {
    return http.get(`${this.contextPath(ctx)}${this.resource}/${idstr}`, { params })
  }

  batchGet (idlist, params = {}, ctx = []) {
    return http.get(`${this.contextPath(ctx)}${this.resource}`, { params: Object.assign(params, { id: idlist, batchGet: true }) })
  }

  getSpecific (idstr, spec, params, ctx = []) {
    return http.get(`${this.contextPath(ctx)}${this.resource}/${idstr}/${spec}`, { params })
  }

  list (params, ctx = [], cancelToken) {
    return http.get(`${this.contextPath(ctx)}${this.resource}`, { params, cancelToken })
  }

  create (data, ctx = []) {
    return http.post(`${this.contextPath(ctx)}${this.resource}`, data)
  }

  batchCreate (data, count, ctx = []) {
    data['__count__'] = count
    return http.post(`${this.contextPath(ctx)}${this.resource}`, data)
  }

  batchPost (idlist, data, ctx = []) {
    return http.post(`${this.contextPath(ctx)}${this.resource}`, data, { params: { id: idlist } })
  }

  update (idstr, data, ctx = []) {
    return http.put(`${this.contextPath(ctx)}${this.resource}/${idstr}`, data)
  }

  batchUpdate (idlist, data, ctx = []) {
    return http.put(`${this.contextPath(ctx)}${this.resource}`, data, { params: { id: idlist } })
  }

  patch (idstr, data, ctx = []) {
    return http.patch(`${this.contextPath(ctx)}${this.resource}/${idstr}`, data)
  }

  batchPatch (idlist, data, ctx = []) {
    return http.patch(`${this.contextPath(ctx)}${this.resource}`, data, { params: { id: idlist } })
  }

  delete (idstr, ctx = []) {
    return http.delete(`${this.contextPath(ctx)}${this.resource}/${idstr}`)
  }

  batchDelete (idlist, ctx = [], data, params = {}) {
    return http.delete(`${this.contextPath(ctx)}${this.resource}`, { params: { id: idlist, ...params }, data })
  }

  performAction (idstr, action, data, ctx = []) {
    return http.post(`${this.contextPath(ctx)}${this.resource}/${idstr}/${action}`, data)
  }

  performClassAction (action, data, params = {}, ctx = []) {
    return http.post(`${this.contextPath(ctx)}${this.resource}/${action}`, data, { params })
  }

  batchPerformAction (idlist, action, data, ctx = []) {
    return http.post(`${this.contextPath(ctx)}${this.resource}/${action}`, data, { params: { id: idlist } })
  }

  objectRpc (methodname, objId, params) {
    let words = camel2Words(methodname)
    console.log('objectrpc words', words)
    if (words[0] === 'get') {
      return this._rpcGet(objId, words.slice(1), params)
    } else if (words[0] === 'post' || words[0] === 'do') {
      return this._rpcPost(objId, words.slice(1), params)
    } else {
      throw new UnknownRpcMethodException(words[0])
    }
  }

  rpc (methodname, params) {
    let words = camel2Words(methodname)
    if (words[0] === 'get') {
      return this._rpcGet(null, words.slice(1), params)
    } else if (words[0] === 'post' || words[0] === 'do') {
      return this._rpcPost(null, words.slice(1), params)
    } else {
      throw new UnknownRpcMethodException(words[0])
    }
  }

  _rpcURL (idstr, words) {
    let url = '/' + this.apiVersion + '/rpc/' + this.resource + '/'
    if (idstr) {
      url += idstr + '/'
    }
    url += words.join('-')
    return url
  }

  _rpcGet (idstr, words, params) {
    let url = this._rpcURL(idstr, words)
    let qs = querystring.stringify(params)
    if (qs) {
      url += '?' + qs
    }
    return http.get(url)
  }

  _rpcPost (idstr, words, params) {
    let url = this._rpcURL(idstr, words)
    return http.post(url, params)
  }

  objectCsrf (methodname, objId, params) {
    let words = camel2Words(methodname)
    if (words[0] === 'get') {
      return this._csrfGet(objId, words.slice(1), params)
    } else if (words[0] === 'post' || words[0] === 'do') {
      return this._csrfPost(objId, words.slice(1), params)
    } else {
      throw new UnknownCsrfMethodException(words[0])
    }
  }

  csrf (methodname, params) {
    let words = camel2Words(methodname)
    if (words[0] === 'get') {
      return this._csrfGet(null, words.slice(1), params)
    } else if (words[0] === 'post' || words[0] === 'do') {
      return this._csrfPost(null, words.slice(1), params)
    } else {
      throw new UnknownCsrfMethodException(words[0])
    }
  }

  _csrfURL (idstr, words) {
    let url = '/' + this.apiVersion + '/csrf/' + this.resource + '/'
    if (idstr) {
      url += idstr
    }
    url += words.join('-')
    return url
  }

  _csrfGet (idstr, words, params) {
    let url = this._csrfURL(idstr, words)
    let qs = querystring.stringify(params)
    if (qs) {
      url += '?' + qs
    }
    return http.get(url)
  }

  _csrfPost (idstr, words, params) {
    let url = this._csrfURL(idstr, words)
    return http.post(url, params)
  }
}

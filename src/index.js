window.WARDEN_EXTRA_DATA = {}

Warden.addData = fn => fn && fn(WARDEN_EXTRA_DATA)

function Warden(opt, CB) {
  try {
    let OPTIONS = {
      domain: '',
      delay: 300,
      extra: {}
    }
    OPTIONS = Object.assign(OPTIONS, opt);
    const DATA = {
      performance: {},
      resourceInfo: [],
      prevUrl: document.referrer && document.referrer !== location.href ? document.referrer : '',
      pageUrl: '',
      requestNum: 0,
      requestInfo: {},
      requestLength: 0,
      hasRequest: false
    }

    let startTime = getCurrentTime()
    let loadTime = 0
    let requestTime = 0

    window.addEventListener('load', () => {
      loadTime = getCurrentTime() - startTime
      handleReportType()
    }, false)

    injectFetch()
    injectAjax()
    injectAxios()

    function injectFetch() {
      if (!window.fetch) return
      const _fetch = fetch
      window.fetch = function (...args) {
        const info = getRequestInfo('fetch', args)
        if (info.type !== 'report-data') {
          clear(1)
          const url = getUrl(info)
          DATA.requestInfo[url] = info
          DATA.requestLength++
          DATA.hasRequest = true
        }
        return _fetch.apply(this, args)
          .then(res => {
            if (info.type === 'report-data') return res
            getRequestTime()
            try {
              const url = getUrl(res)
              res.clone().text().then(data => {
                if (DATA.requestInfo[url]) {
                  DATA.requestInfo[url]['decodedBodySize'] = data.length
                }
              })
            } catch (err) {
            }
            return res
          })
          .catch(err => {
            if (info.type === 'report-data') return
            return err
          })
      }
    }

    function injectAjax(...injectArgs) {
      const _ajax = window.$.ajax
      Object.defineProperty(window.$, 'ajax', {
        configurable: true,
        enumerable: true,
        writable: true,
        value(...args) {
          const info = ajaxArgs(args)
          const url = info.url ? info.url.split('?')[0] : ''
          DATA.ajaxInfo[url] = info
          DATA.ajaxLength++
          DATA.hasAjax = true
          const _complete = args[0].complete || function (data) {
          }
          args[0].complete = function (data) {
            if (data.status === 200 && data.readyState === 4) {
              const url = this.url ? this.url.split('?')[0] : '';
              try {
                if (DATA.ajaxInfo[url]) {
                  DATA.ajaxInfo[url]['decodedBodySize'] = data.responseText.length
                  getAjaxTime('load');
                }
              } catch (err) {

              }
            }
            return _complete.apply(this, args)
          }
          return _ajax.apply(this, injectArgs)
        }
      })
    }

    function injectAxios() {
      if (!window.axios) return
      const _axios = window.axios
      const list = ['axios', 'request', 'get', 'delete', 'head', 'options', 'put', 'post', 'patch']
      list.forEach(item => {
        let key = null
        if (item === 'axios') {
          window['axios'] = inject;
          key = _axios
        } else if (item === 'request') {
          window['axios']['request'] = inject
          key = _axios['request']
        } else {
          window['axios'][item] = inject
          key = _axios['request']
        }

        function inject(...args) {
          const info = ajaxArgs(args, item)
          if (info.report !== 'report-data') {
            const url = info.url ? info.url.split('?')[0] : ''
            DATA.ajaxInfo[url] = info
            DATA.ajaxLength++
            DATA.hasAjax = true
          }
          return key.apply(this, args)
            .then(res => {
              if (info.report === 'report-data') return res
              getAjaxTime('load')
              try {
                const responseURL = res.request.responseURL ? res.request.responseURL.split('?')[0] : ''
                const responseText = res.request.responseText
                if (DATA.ajaxInfo[responseURL]) {
                  DATA.ajaxInfo[responseURL]['decodedBodySize'] = responseText.length
                }
              } catch (err) {
              }
              return res
            })
            .catch(err => {
              return err
            })
        }
      })
    }

    function getRequestInfo(type, args, item) {
      const info = {
        method: 'GET',
        type: 'xmlhttprequest',
      }
      try {
        if (type === 'fetch') {
          if (!args || !args.length) return info
          if (args.length === 1) {
            if (typeof (args[0]) === 'string') {
              info.url = args[0]
            } else if (typeof (args[0]) === 'object') {
              info.url = args[0].url
              info.method = args[0].method
            }
          } else {
            info.url = args[0]
            info.method = args[1].method || 'GET'
            info.type = args[1].type || 'fetchrequest'
          }
        } else if (type === 'jquery') {
          const { url, type, report, data } = args[0]
          info.url = url
          info.method = type
          info.report = report
          info.options = data
        } else if (type === 'axios') {
          if (item === 'axios' || item === 'request') {
            const { url, data, method, params } = args[0]
            info.url = url
            info.method = method
            info.options = method.toLowerCase() === 'get' ? params : data
          } else {
            info.url = args[0]
            info.method = ''
            if (args[1]) {
              if (args[1].params) {
                info.method = 'GET'
                info.options = args[1].params;
              } else {
                info.method = 'POST'
                info.options = args[1];
              }
            }
          }
          info.report = args[0].report
        }
      } catch (err) {
      }
      return info
    }

    function getRequestTime() {
      DATA.requestNum++
      if (DATA.requestNum === DATA.requestLength) {
        DATA.requestNum = DATA.requestLength = 0
        requestTime = getCurrentTime() - startTime
        handleReportType()
      }
    }

    const getResourceInfo = () => {
      if (!window.performance || !window.performance.getEntries) return false
      const resourceList = performance.getEntriesByType('resource')
      let resourceInfo = []
      if (!resourceList || !resourceList.length) return resourceInfo
      resourceList.forEach(item => {
        const info = {
          name: item.name,
          method: 'GET',
          type: item.initiatorType,
          duration: item.duration.toFixed(2) || 0,
          decodedBodySize: item.decodedBodySize || 0,
          nextHopProtocol: item.nextHopProtocol
        }
        const name = getUrl(item, 'name')
        const requestInfo = DATA.requestInfo[name]
        if (requestInfo) {
          info.method = requestInfo.method || info.method
          info.type = requestInfo.type || info.type
          info.decodedBodySize = info.decodedBodySize || requestInfo.decodedBodySize
        }
        resourceInfo.push(info)
      })
      DATA.resourceInfo = resourceInfo
    }

    const getPerformance = () => {
      let timing = window.performance.timing;
      if (typeof window.PerformanceNavigationTiming === 'function') {
        try {
          var nt2Timing = performance.getEntriesByType('navigation')[0]
          if (nt2Timing) {
            timing = nt2Timing
          }
        } catch (err) {
        }
      }
      DATA.performance = {
        // 重定向时间
        rd: timing.redirectEnd - timing.redirectStart || 0,
        // dns查询耗时
        dn: timing.domainLookupEnd - timing.domainLookupStart || 0,
        // TTFB 读取页面第一个字节的时间
        tt: timing.responseStart - timing.navigationStart || 0,
        // DNS 缓存时间
        ap: timing.domainLookupStart - timing.fetchStart || 0,
        // 卸载页面的时间
        ul: timing.unloadEventEnd - timing.unloadEventStart || 0,
        // tcp连接耗时
        tp: timing.connectEnd - timing.connectStart || 0,
        // request请求耗时
        rq: timing.responseEnd - timing.requestStart || 0,
        // 解析dom树耗时
        tr: timing.domComplete - timing.domInteractive || 0,
        // 白屏时间
        bl: (timing.domInteractive || timing.domLoading) - timing.fetchStart || 0,
        // domReadyTime
        dr: timing.domContentLoadedEventEnd - timing.fetchStart || 0
      }
    }


    function handleReportType() {
      if (DATA.pageUrl !== location.href) {
        reportData(1)
      } else {
        reportData(2)
      }
    }

    function reportData(type = 1) {
      setTimeout(() => {
        getPerformance()
        getResourceInfo()
        const screenWidth = document.documentElement.clientWidth || document.body.clientWidth
        const screenHeight = document.documentElement.clientHeight || document.body.clientHeight
        let info = {
          time: new Date().getTime(),
          extraData: WARDEN_EXTRA_DATA,
          type,
          url: location.href
        }
        if (type === 1) {
          info = {
            ...info,
            prevUrl: DATA.prevUrl,
            performance: DATA.performance,
            resourceInfo: DATA.resourceInfo,
            screenWidth,
            screenHeight,
          }
        } else if (type === 2) {
          info = {
            ...info,
            resourceInfo: DATA.resourceInfo,
          }
        }

        info = Object.assign(info, OPTIONS.add)
        CB && CB(info)
        if (!CB && window.fetch) {
          fetch(OPTIONS.domain, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            type: 'report-data',
            body: JSON.stringify(info)
          })
        }
        Promise.resolve().then(() => clear());
      }, OPTIONS.delay)
    }

    function clear(type = 0) {
      if (window.performance && window.performance.clearResourceTimings) {
        performance.clearResourceTimings()
      }
      DATA.performance = {}
      DATA.prevUrl = ''
      DATA.resourceInfo = []
      DATA.hasAjax = false
      DATA.ajaxInfo = {}
      window.WARDEN_EXTRA_DATA = {}
      requestTime = 0
      if (type === 0) DATA.pageUrl = location.href
    }

    function getCurrentTime() {
      return (window.performance && performance.now()) || new Date().getTime()
    }

    function getUrl(info, key = 'url') {
      return info[key] ? info[key].split('?')[0] : ''
    }
  } catch (err) {
  }
}


if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
  module.exports = Warden
} else {
  window.Warden = Warden
}

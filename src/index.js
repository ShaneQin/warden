window.WARDEN_EXTRA_DATA = {}

Warden.addData = fn => fn && fn(WARDEN_EXTRA_DATA)

function Warden(opt, cb) {
  let OPTIONS = {
    domain: '',
    delay: 300,
    extra: {}
  }
  OPTIONS = Object.assign(OPTIONS, opt);
  const DATA = {
    performance: {},
    resourceInfo: [],
    fetchNum: 0,
    fetchLength: 0,
    prevUrl: document.referrer && document.referrer !== location.href ? document.referrer : '',
    pageUrl: '',
    ajaxNum: 0,
    ajaxInfo: {},
    ajaxLength: 0,
    hasAjax: false
  }

  let startTime = performance.now()
  let loadTime = 0
  let fetchTime = 0
  let ajaxTime = 0

  window.addEventListener('load', () => {
    loadTime = performance.now() - startTime
    handleReportType()
  }, false)

  injectFetch()
  injectAjax()
  injectAxios()

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

      if (!cb && window.fetch) {
        fetch(OPTIONS.domain, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          type: 'report-data',
          body: JSON.stringify(info)
        })
      }
      Promise.resolve().then(() => {
        clear()
      });
    }, OPTIONS.delay)
  }

  function handleReportType() {
    if (DATA.pageUrl !== location.href) {
      // 页面性能
      reportData(1)
    } else {
      // ajax
      reportData(2)
    }
  }

  const getRequestInfo = (...args) => {
    const info = {
      method: 'GET',
      type: 'fetchrequest'
    }
    if (!args || !args.length) return info
    try {
      if (args.length === 1) {
        if (typeof args[0] === 'string') {
          info.url = args[0]
        } else if (typeof args[0] === 'string') {
          info.url = args[0].url
          info.method = args[0].method
        }
      } else {
        info.url = args[0]
        info.method = args[1].method || 'GET'
        info.type = args[1].type || 'fetchrequest'
      }
    } catch (err) {

    }
    return info
  }

  function injectFetch() {
    if (!window.fetch) return;
    const _fetch = fetch
    window.fetch = function () {
      const args = arguments
      const info = getRequestInfo(args)
      return _fetch.apply(this, arguments)
        .then(res => {
          if (info.type === 'report-data') return res
          try {

          } catch (e) {
          }
          getFetchTime()
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
          
        }
      }
    })
  }

  function ajaxArgs(args, item) {
    const info = {
      method: 'GET',
      type: 'xmlhttprequest',
      report: ''
    }
    try {

      if (item) {
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
      } else {
        const { url, type, report, data } = args[0]
        info.url = url
        info.method = type
        info.report = report
        info.options = data
      }
    } catch (err) {

    }
    return info
  }

  function getFetchTime() {
    DATA.fetchNum++
    if (DATA.fetchNum === DATA.fetchLength) {
      DATA.fetchNum = DATA.fetchLength = 0
      fetchTime = performance.now() - startTime
      handleReportType()
    }
  }

  function getAjaxTime() {
    DATA.ajaxNum++
    if (DATA.ajaxNum === DATA.ajaxLength) {
      DATA.ajaxNum = DATA.ajaxLength = 0
      ajaxTime = performance.now() - startTime
      handleReportType()
    }
  }

  const getResourceInfo = () => {
    if (!window.performance || !window.performance.getEntries) return false
    const resourceList = performance.getEntriesByType('resource')
    let resourceInfo = []
    resourceList.forEach(item => {
      const info = {
        name: item.name,
        method: 'GET',
        type: item.initiatorType,
        duration: item.duration.toFixed(2) || 0,
        decodedBodySize: item.decodedBodySize || 0,
        nextHopProtocol: item.nextHopProtocol
      }
      // todo
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

  function clear() {
    if (window.performance && window.performance.clearResourceTimings) {
      performance.clearResourceTimings()
    }
    DATA.performance = {}
    DATA.prevUrl = ''
    DATA.resourceInfo = []
    DATA.pageUrl = location.href
    DATA.hasAjax = false
    DATA.ajaxInfo = {}
    window.WARDEN_EXTRA_DATA = {}
    ajaxTime = 0
  }
}


if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
  module.exports = Warden
} else {
  window.Warden = Warden
}

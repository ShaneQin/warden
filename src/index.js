const Warden = (options) => {
  const data = {
    performance: {},
    resourceInfo: [],
    ajaxInfo: {},
    fetchNum: 0,
    fetchLength: 0,
  }

  let startTime = performance.now()
  let loadTime = 0
  let fetchTime = 0

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

  const injectFetch = () => {
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
          getFetchTime()
          return err
        })
    }
  }

  function getFetchTime() {
    data.fetchNum++
    if (data.fetchNum === data.fetchLength) {
      data.fetchNum = data.fetchLength = 0
      fetchTime = performance.now() - startTime
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
    data.resourceInfo = resourceInfo
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
    data.performance = {
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

  function reportData(type = 1) {
    const info = {
      time: new Date().getTime(),
      url: location.href,
      type: 1
    }
    if (type === 1) {

    } else if (type === 2) {
      
    }
  }
}


if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
  module.exports = Warden
} else {
  window.Warden = Warden
}

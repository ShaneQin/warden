import { getLCP, getFID, getCLS } from 'web-vitals'

if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
  module.exports = Warden
} else {
  window.Warden = Warden
}

function Warden(opt, CB) {
  try {
    let OPTIONS = {
      domain: '',
      delay: 300,
      extra: {}
    }
    OPTIONS = Object.assign(OPTIONS, opt)
    const DATA = {
      performance: {},
      resourceInfo: [],
      pageUrl: '',
      systemInfo: '',
      LCP: '',
      FID: '',
      CLS: ''
    }

    let startTime = getCurrentTime()
    let loadTime = 0

    window.addEventListener('load', () => {
      loadTime = getCurrentTime() - startTime
      reportData(1)
    }, false)

    getLCP(data => {
      DATA.LCP = data
      reportData(2, 'LCP')
    })

    getFID(data => {
      DATA.FID = data
      reportData(2, 'FID')
    })

    getCLS(data => {
      DATA.CLS = data
      reportData(2, 'CLS')
    })

    function getResourceInfo() {
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
        resourceInfo.push(info)
      })
      DATA.resourceInfo = resourceInfo
    }

    function getPerformance() {
      let timing = window.performance.timing
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
        redirect: timing.redirectEnd - timing.redirectStart || 0,
        // dns查询耗时
        dnsLoopUp: timing.domainLookupEnd - timing.domainLookupStart || 0,
        // TTFB 读取页面第一个字节的时间
        ttfb: timing.responseStart - timing.navigationStart || 0,
        // DNS 缓存时间
        dnsCache: timing.domainLookupStart - timing.fetchStart || 0,
        // 卸载页面的时间
        unload: timing.unloadEventEnd - timing.unloadEventStart || 0,
        // tcp连接耗时
        connect: timing.connectEnd - timing.connectStart || 0,
        // request请求耗时
        request: timing.responseEnd - timing.requestStart || 0,
        // 解析dom树耗时
        domTree: timing.domComplete - timing.domInteractive || 0,
        // 白屏时间
        blank: (timing.domInteractive || timing.domLoading) - timing.fetchStart || 0,
        // domReadyTime
        domReady: timing.domContentLoadedEventEnd - timing.fetchStart || 0
      }
    }

    function getSystemInfo() {
      // 权重：系统 + 系统版本 > 平台 > 内核 + 载体 + 内核版本 + 载体版本 > 外壳 + 外壳版本
      const ua = navigator.userAgent.toLowerCase()
      const testUa = regexp => regexp.test(ua)
      const testVs = regexp => ua.match(regexp)
        .toString()
        .replace(/[^0-9|_.]/g, '')
        .replace(/_/g, '.')
      // 系统
      let system = 'unknow'
      if (testUa(/windows|win32|win64|wow32|wow64/g)) {
        system = 'windows' // windows系统
      } else if (testUa(/macintosh|macintel/g)) {
        system = 'macos' // macos系统
      } else if (testUa(/x11/g)) {
        system = 'linux' // linux系统
      } else if (testUa(/android|adr/g)) {
        system = 'android' // android系统
      } else if (testUa(/ios|iphone|ipad|ipod|iwatch/g)) {
        system = 'ios' // ios系统
      }
      // 系统版本
      let systemVs = 'unknow'
      if (system === 'windows') {
        if (testUa(/windows nt 5.0|windows 2000/g)) {
          systemVs = '2000'
        } else if (testUa(/windows nt 5.1|windows xp/g)) {
          systemVs = 'xp'
        } else if (testUa(/windows nt 5.2|windows 2003/g)) {
          systemVs = '2003'
        } else if (testUa(/windows nt 6.0|windows vista/g)) {
          systemVs = 'vista'
        } else if (testUa(/windows nt 6.1|windows 7/g)) {
          systemVs = '7'
        } else if (testUa(/windows nt 6.2|windows 8/g)) {
          systemVs = '8'
        } else if (testUa(/windows nt 6.3|windows 8.1/g)) {
          systemVs = '8.1'
        } else if (testUa(/windows nt 10.0|windows 10/g)) {
          systemVs = '10'
        }
      } else if (system === 'macos') {
        systemVs = testVs(/os x [\d._]+/g)
      } else if (system === 'android') {
        systemVs = testVs(/android [\d._]+/g)
      } else if (system === 'ios') {
        systemVs = testVs(/os [\d._]+/g)
      }
      // 平台
      let platform = 'unknow'
      if (system === 'windows' || system === 'macos' || system === 'linux') {
        platform = 'desktop' // 桌面端
      } else if (system === 'android' || system === 'ios' || testUa(/mobile/g)) {
        platform = 'mobile' // 移动端
      }
      // 内核和载体
      let engine = 'unknow'
      let supporter = 'unknow'
      if (testUa(/applewebkit/g)) {
        engine = 'webkit' // webkit内核
        if (testUa(/edge/g)) {
          supporter = 'edge' // edge浏览器
        } else if (testUa(/opr/g)) {
          supporter = 'opera' // opera浏览器
        } else if (testUa(/chrome/g)) {
          supporter = 'chrome' // chrome浏览器
        } else if (testUa(/safari/g)) {
          supporter = 'safari' // safari浏览器
        }
      } else if (testUa(/gecko/g) && testUa(/firefox/g)) {
        engine = 'gecko' // gecko内核
        supporter = 'firefox' // firefox浏览器
      } else if (testUa(/presto/g)) {
        engine = 'presto' // presto内核
        supporter = 'opera' // opera浏览器
      } else if (testUa(/trident|compatible|msie/g)) {
        engine = 'trident' // trident内核
        supporter = 'iexplore' // iexplore浏览器
      }
      // 内核版本
      let engineVs = 'unknow'
      if (engine === 'webkit') {
        engineVs = testVs(/applewebkit\/[\d._]+/g)
      } else if (engine === 'gecko') {
        engineVs = testVs(/gecko\/[\d._]+/g)
      } else if (engine === 'presto') {
        engineVs = testVs(/presto\/[\d._]+/g)
      } else if (engine === 'trident') {
        engineVs = testVs(/trident\/[\d._]+/g)
      }
      // 载体版本
      let supporterVs = 'unknow'
      if (supporter === 'chrome') {
        supporterVs = testVs(/chrome\/[\d._]+/g)
      } else if (supporter === 'safari') {
        supporterVs = testVs(/version\/[\d._]+/g)
      } else if (supporter === 'firefox') {
        supporterVs = testVs(/firefox\/[\d._]+/g)
      } else if (supporter === 'opera') {
        supporterVs = testVs(/opr\/[\d._]+/g)
      } else if (supporter === 'iexplore') {
        supporterVs = testVs(/(msie [\d._]+)|(rv:[\d._]+)/g)
      } else if (supporter === 'edge') {
        supporterVs = testVs(/edge\/[\d._]+/g)
      }
      // 外壳和外壳版本
      let shell = 'none'
      let shellVs = 'unknow'
      if (testUa(/micromessenger/g)) {
        shell = 'wechat' // 微信浏览器
        shellVs = testVs(/micromessenger\/[\d._]+/g)
      } else if (testUa(/qqbrowser/g)) {
        shell = 'qq' // QQ浏览器
        shellVs = testVs(/qqbrowser\/[\d._]+/g)
      } else if (testUa(/ucbrowser/g)) {
        shell = 'uc' // UC浏览器
        shellVs = testVs(/ucbrowser\/[\d._]+/g)
      } else if (testUa(/qihu 360se/g)) {
        shell = '360' // 360浏览器(无版本)
      } else if (testUa(/2345explorer/g)) {
        shell = '2345' // 2345浏览器
        shellVs = testVs(/2345explorer\/[\d._]+/g)
      } else if (testUa(/metasr/g)) {
        shell = 'sougou' // 搜狗浏览器(无版本)
      } else if (testUa(/lbbrowser/g)) {
        shell = 'liebao' // 猎豹浏览器(无版本)
      } else if (testUa(/maxthon/g)) {
        shell = 'maxthon' // 遨游浏览器
        shellVs = testVs(/maxthon\/[\d._]+/g)
      }
      const systemInfo = Object.assign({
        engine, // webkit gecko presto trident
        engineVs,
        platform, // desktop mobile
        supporter, // chrome safari firefox opera iexplore edge
        supporterVs,
        system, // windows macos linux android ios
        systemVs
      }, shell === 'none' ? {} : {
        shell, // wechat qq uc 360 2345 sougou liebao maxthon
        shellVs
      })
      DATA.systemInfo = systemInfo
    }

    function reportData(type = 1, name) {
      setTimeout(() => {
        getPerformance()
        getResourceInfo()
        getSystemInfo()
        let info = {
          type,
          time: new Date().getTime(),
          url: location.href,
        }
        if (type === 1) {
          info = {
            ...info,
            performance: DATA.performance,
            resourceInfo: DATA.resourceInfo,
            systemInfo: DATA.systemInfo,
            extra: OPTIONS.extra,
          }
        } else if (type === 2) {
          info = {
            ...info,
            [name]: DATA[name]
          }
        }

        info = Object.assign(info, OPTIONS.add)
        CB && CB(info)
        if (!CB) {
          sendData(OPTIONS.domain, info)
        }
      }, OPTIONS.delay)
    }

    function getCurrentTime() {
      return (window.performance && performance.now()) || new Date().getTime()
    }

    function sendData(url, data) {
      const xhr = new XMLHttpRequest()
      xhr.open('post', url, true)
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          let data = xhr.responseText
          console.log(data)
        }
      }
      const body = JSON.stringify(data)
      xhr.setRequestHeader('Content-type', 'application/json')
      xhr.send(body)
    }
  } catch (err) {
  }
}

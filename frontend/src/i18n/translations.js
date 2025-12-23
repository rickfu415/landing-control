export const translations = {
  en: {
    // Menu
    menu: {
      title: 'ROCKET',
      titleHighlight: 'LANDER',
      subtitle: 'First Stage Landing Simulator',
      rocketSelection: 'Select Rocket',
      gameMode: 'Game Mode',
      modes: {
        manual: {
          label: 'Manual',
          desc: 'Full control'
        },
        assisted: {
          label: 'Assisted',
          desc: 'Auto attitude'
        },
        autonomous: {
          label: 'Auto',
          desc: 'Watch AI'
        }
      },
      launchMission: 'Launch Mission',
      connecting: 'Connecting...',
      vehicleSpecs: 'Vehicle Specifications (Falcon 9 Block 5)',
      specs: {
        dryMass: 'Dry Mass: 22,200 kg',
        landingFuel: 'Landing Fuel: 3,000 kg ⚠️',
        engine: 'Engine: Merlin 1D',
        thrust: 'Thrust: 845 kN',
        isp: 'ISP: 282s (sea level)',
        throttle: 'Throttle: 40-100%',
        gimbal: 'Gimbal: ±5°',
        gravity: 'Gravity: 9.80665 m/s²'
      },
      missionBriefing: 'Mission Briefing',
      briefing: {
        initial: 'Initial: 5,000m altitude, -180 m/s descent',
        fuelWarning: 'Only 3,000 kg fuel - be efficient!',
        landingVelocity: 'Land with velocity < 2 m/s vertical',
        padDistance: 'Stay within 25m of pad center'
      },
      controls: 'Controls',
      controlsHints: {
        throttle: 'W/S - Throttle up/down',
        camera: '🖱️ Drag - Orbit camera',
        gimbal: 'A/D/Q/E - Gimbal control',
        zoom: 'Scroll - Zoom in/out',
        fullThrottle: 'SPACE - Full throttle',
        pause: 'P - Pause game'
      },
      footer: 'Good luck, astronaut! 🚀',
      rockets: {
        falcon9_block5_landing: 'Falcon 9',
        starship_super_heavy: 'Starship Super Heavy',
        long_march5_core: 'Long March 5',
        long_march9_first_stage: 'Long March 9',
        soyuz_first_stage: 'Soyuz Core',
        soyuz_booster: 'Soyuz Booster',
        proton_m_first_stage: 'Proton-M',
        angara_a5_first_stage: 'Angara A5',
        zhuque2_first_stage: 'Zhuque-2',
        zhuque3_first_stage: 'Zhuque-3'
      }
    },
    
    // HUD
    hud: {
      phase: 'Phase',
      phases: {
        descent: 'Descent',
        landing_burn: 'Landing Burn',
        final_approach: 'Final Approach',
        touchdown: 'Touchdown'
      },
      telemetry: 'Telemetry',
      altitude: 'Altitude',
      verticalSpeed: 'Vertical Speed',
      horizontalSpeed: 'Horizontal Speed',
      totalSpeed: 'Total Speed',
      dynamics: 'Dynamics',
      acceleration: 'Acceleration',
      gForce: 'G-Force',
      twr: 'TWR',
      distToPad: 'Dist to Pad',
      timeToImpact: 'Time to Impact',
      position: 'Position',
      missionTime: 'Mission Time',
      mode: 'Mode',
      propulsion: 'Propulsion',
      throttle: 'Throttle',
      fuel: 'Fuel',
      fuelPercent: 'Fuel %',
      dryMass: 'Dry Mass',
      totalMass: 'Total Mass',
      thrust: 'Thrust',
      flowRate: 'Flow Rate',
      attitude: 'Attitude',
      gimbalP: 'Gimbal P',
      gimbalY: 'Gimbal Y',
      legs: 'Legs',
      legsDeployed: 'DEPLOYED',
      legsStowed: 'STOWED',
      cameraHint: '🖱️ Drag to orbit around rocket',
      zoomHint: 'Scroll to zoom in/out',
      paused: 'PAUSED',
      pausedHint: 'Press P or click Resume to continue'
    },
    
    // Controls
    controls: {
      throttle: 'Throttle',
      cut: 'CUT',
      max: 'MAX',
      gimbal: 'Gimbal',
      resume: '▶ Resume',
      pause: '⏸ Pause',
      reset: '↺ Reset',
      hints: {
        throttle: 'W/S: Throttle',
        gimbal: 'A/D/Q/E: Gimbal',
        throttleKeys: 'SPACE: Full | X: Cut',
        gameKeys: 'P: Pause | R: Reset'
      }
    },
    
    // Game Over
    gameOver: {
      landed: 'LANDED!',
      crashed: 'CRASHED',
      landedMessage: 'The falcon has landed!',
      crashedMessage: 'Better luck next time, astronaut',
      finalScore: 'Final Score',
      flightTime: 'Flight Time',
      fuelRemaining: 'Fuel Remaining',
      finalPosition: 'Final Position',
      finalSpeed: 'Final Speed',
      scoreBreakdown: 'Score Breakdown',
      landingAccuracy: 'Landing Accuracy',
      velocityBonus: 'Velocity Bonus',
      fuelEfficiency: 'Fuel Efficiency',
      viewFlightReview: 'View Flight Review',
      tryAgain: 'Try Again',
      tipSuccess: 'Pro tip: Start your landing burn earlier for softer touchdowns',
      tipFailed: 'Tip: Watch your vertical speed and start braking earlier'
    },
    
    // Connection
    connection: {
      connecting: '⚠ Connecting to server...'
    }
  },
  
  zh: {
    // 菜单
    menu: {
      title: '火箭',
      titleHighlight: '着陆器',
      subtitle: '第一级着陆模拟器',
      rocketSelection: '选择火箭',
      gameMode: '游戏模式',
      modes: {
        manual: {
          label: '手动',
          desc: '完全控制'
        },
        assisted: {
          label: '辅助',
          desc: '自动姿态'
        },
        autonomous: {
          label: '自动',
          desc: '观看AI'
        }
      },
      launchMission: '启动任务',
      connecting: '连接中...',
      vehicleSpecs: '飞行器规格（猎鹰9号 Block 5）',
      specs: {
        dryMass: '干质量：22,200 千克',
        landingFuel: '着陆燃料：3,000 千克 ⚠️',
        engine: '发动机：梅林1D',
        thrust: '推力：845 千牛',
        isp: '比冲：282秒（海平面）',
        throttle: '节流阀：40-100%',
        gimbal: '万向节：±5°',
        gravity: '重力：9.80665 米/秒²'
      },
      missionBriefing: '任务简报',
      briefing: {
        initial: '初始：5,000米高度，-180 米/秒下降',
        fuelWarning: '仅有 3,000 千克燃料 - 请高效使用！',
        landingVelocity: '着陆时垂直速度 < 2 米/秒',
        padDistance: '保持在着陆台中心 25 米范围内'
      },
      controls: '控制',
      controlsHints: {
        throttle: 'W/S - 增减油门',
        camera: '🖱️ 拖动 - 环绕相机',
        gimbal: 'A/D/Q/E - 万向节控制',
        zoom: '滚轮 - 放大/缩小',
        fullThrottle: '空格 - 全油门',
        pause: 'P - 暂停游戏'
      },
      footer: '祝你好运，宇航员！🚀',
      rockets: {
        falcon9_block5_landing: '猎鹰9号',
        starship_super_heavy: '星舰超重型助推器',
        long_march5_core: '长征五号',
        long_march9_first_stage: '长征九号',
        soyuz_first_stage: '联盟号核心级',
        soyuz_booster: '联盟号助推器',
        proton_m_first_stage: '质子-M',
        angara_a5_first_stage: '安加拉A5',
        zhuque2_first_stage: '朱雀二号',
        zhuque3_first_stage: '朱雀三号'
      }
    },
    
    // HUD
    hud: {
      phase: '阶段',
      phases: {
        descent: '下降',
        landing_burn: '着陆燃烧',
        final_approach: '最终进场',
        touchdown: '触地'
      },
      telemetry: '遥测',
      altitude: '高度',
      verticalSpeed: '垂直速度',
      horizontalSpeed: '水平速度',
      totalSpeed: '总速度',
      dynamics: '动力学',
      acceleration: '加速度',
      gForce: 'G力',
      twr: '推重比',
      distToPad: '距着陆台',
      timeToImpact: '撞击时间',
      position: '位置',
      missionTime: '任务时间',
      mode: '模式',
      propulsion: '推进',
      throttle: '油门',
      fuel: '燃料',
      fuelPercent: '燃料 %',
      dryMass: '干质量',
      totalMass: '总质量',
      thrust: '推力',
      flowRate: '流量',
      attitude: '姿态',
      gimbalP: '万向节 P',
      gimbalY: '万向节 Y',
      legs: '着陆腿',
      legsDeployed: '已展开',
      legsStowed: '已收起',
      cameraHint: '🖱️ 拖动以环绕火箭',
      zoomHint: '滚轮放大/缩小',
      paused: '已暂停',
      pausedHint: '按 P 或点击继续以继续'
    },
    
    // 控制
    controls: {
      throttle: '油门',
      cut: '切断',
      max: '最大',
      gimbal: '万向节',
      resume: '▶ 继续',
      pause: '⏸ 暂停',
      reset: '↺ 重置',
      hints: {
        throttle: 'W/S：油门',
        gimbal: 'A/D/Q/E：万向节',
        throttleKeys: '空格：全开 | X：切断',
        gameKeys: 'P：暂停 | R：重置'
      }
    },
    
    // 游戏结束
    gameOver: {
      landed: '着陆成功！',
      crashed: '坠毁',
      landedMessage: '猎鹰已着陆！',
      crashedMessage: '下次好运，宇航员',
      finalScore: '最终得分',
      flightTime: '飞行时间',
      fuelRemaining: '剩余燃料',
      finalPosition: '最终位置',
      finalSpeed: '最终速度',
      scoreBreakdown: '得分明细',
      landingAccuracy: '着陆精度',
      velocityBonus: '速度奖励',
      fuelEfficiency: '燃料效率',
      viewFlightReview: '查看飞行回顾',
      tryAgain: '再试一次',
      tipSuccess: '专业提示：提前开始着陆燃烧以获得更柔和的触地',
      tipFailed: '提示：注意垂直速度并提前开始制动'
    },
    
    // 连接
    connection: {
      connecting: '⚠ 正在连接服务器...'
    }
  }
}

// Hook to get translations
export const useTranslation = (language) => {
  return translations[language] || translations.en
}


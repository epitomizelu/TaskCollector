

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import styles from './styles';

interface TaskData {
  title: string;
  sentence: string;
  translation: string;
  audioUrl: string;
  duration: number;
}

const TaskDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // 音频播放状态
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentAudioProgress, setCurrentAudioProgress] = useState(0);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [loopMode, setLoopMode] = useState<'list' | 'single'>('list');
  
  // 录音状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);
  const [isRecordPlaying, setIsRecordPlaying] = useState(false);
  const [currentRecordProgress, setCurrentRecordProgress] = useState(0);
  
  // 对比播放状态
  const [isComparing, setIsComparing] = useState(false);
  
  // 完成状态
  const [isCompleted, setIsCompleted] = useState(false);
  
  // 定时器引用
  const audioProgressInterval = useRef<number | null>(null);
  const recordingInterval = useRef<number | null>(null);
  const comparisonTimeout = useRef<number | null>(null);
  
  // 模拟任务数据
  const mockTasks: Record<string, TaskData> = {
    task1: {
      title: '英语单词 - 第3单元',
      sentence: 'Hello, how are you today? I\'m fine, thank you. And you?',
      translation: '你好，你今天怎么样？我很好，谢谢。你呢？',
      audioUrl: 'mock_audio_1.mp3',
      duration: 5,
    },
    task2: {
      title: '古文背诵 - 出师表',
      sentence: '先帝创业未半而中道崩殂，今天下三分，益州疲弊，此诚危急存亡之秋也。',
      translation: '先帝开创大业未完成一半却中途去世了，现在天下分为三国，我们蜀汉人力疲惫、民生凋敝，这实在是国家危急存亡的时刻啊。',
      audioUrl: 'mock_audio_2.mp3',
      duration: 8,
    },
    task3: {
      title: '日语对话练习',
      sentence: 'おはようございます。今日の天気はとてもいいですね。',
      translation: '早上好。今天的天气真不错呢。',
      audioUrl: 'mock_audio_3.mp3',
      duration: 4,
    },
  };
  
  const currentTask = mockTasks[params.taskId as string] || mockTasks.task1;
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (audioProgressInterval.current) {
        clearInterval(audioProgressInterval.current);
      }
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      if (comparisonTimeout.current) {
        clearTimeout(comparisonTimeout.current);
      }
    };
  }, []);
  
  // 返回按钮处理
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };
  
  // 播放/暂停原音频
  const handleAudioPlayPause = () => {
    if (isAudioPlaying) {
      handleAudioPause();
    } else {
      handleAudioPlay();
    }
  };
  
  const handleAudioPlay = () => {
    console.log('需要调用第三方接口实现音频播放功能');
    setIsAudioPlaying(true);
    
    // 模拟进度条更新
    audioProgressInterval.current = setInterval(() => {
      setCurrentAudioProgress(prev => {
        const newProgress = prev + 2;
        if (newProgress >= 100) {
          if (loopMode === 'list') {
            handleAudioPause();
            return 0;
          } else {
            return 0;
          }
        }
        setCurrentAudioTime(Math.floor((newProgress / 100) * currentTask.duration));
        return newProgress;
      });
    }, 100) as unknown as number;
  };
  
  const handleAudioPause = () => {
    console.log('需要调用第三方接口实现音频暂停功能');
    setIsAudioPlaying(false);
    
    if (audioProgressInterval.current) {
      clearInterval(audioProgressInterval.current);
    }
  };
  
  // 播放速度控制
  const handleSpeedControl = () => {
    const speeds = [0.75, 1, 1.25, 1.5];
    const currentIndex = speeds.indexOf(audioSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setAudioSpeed(speeds[nextIndex]);
    console.log(`需要调用第三方接口将播放速度调整为 ${speeds[nextIndex]}x`);
  };
  
  // 循环模式控制
  const handleLoopMode = () => {
    const newMode = loopMode === 'list' ? 'single' : 'list';
    setLoopMode(newMode);
    console.log(`循环模式已切换为: ${newMode}`);
  };
  
  // 进度条变化处理
  const handleProgressChange = (value: number) => {
    setCurrentAudioProgress(value);
    setCurrentAudioTime(Math.floor((value / 100) * currentTask.duration));
    console.log(`需要调用第三方接口将音频进度调整到: ${value}%`);
  };
  
  // 录音控制
  const handleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };
  
  const handleStartRecording = () => {
    console.log('需要调用第三方接口实现录音功能');
    setIsRecording(true);
    setRecordingTime(0);
    
    recordingInterval.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000) as unknown as number;
  };
  
  const handleStopRecording = () => {
    console.log('需要调用第三方接口停止录音');
    setIsRecording(false);
    setHasRecordedAudio(true);
    
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
    }
  };
  
  // 录音播放控制
  const handleRecordPlayPause = () => {
    if (isRecordPlaying) {
      console.log('需要调用第三方接口暂停用户录音播放');
      setIsRecordPlaying(false);
    } else {
      console.log('需要调用第三方接口播放用户录音');
      setIsRecordPlaying(true);
    }
  };
  
  // 录音进度条处理
  const handleRecordProgressChange = (value: number) => {
    setCurrentRecordProgress(value);
    console.log(`需要调用第三方接口将录音播放进度调整到: ${value}%`);
  };
  
  // 对比播放控制
  const handleComparison = () => {
    if (isComparing) {
      handleStopComparison();
    } else {
      handleStartComparison();
    }
  };
  
  const handleStartComparison = () => {
    console.log('需要调用第三方接口同时播放原音频和用户录音');
    setIsComparing(true);
    
    // 3秒后自动停止对比
    comparisonTimeout.current = setTimeout(() => {
      handleStopComparison();
    }, 3000) as unknown as number;
  };
  
  const handleStopComparison = () => {
    console.log('需要调用第三方接口停止对比播放');
    setIsComparing(false);
  };
  
  // 完成任务
  const handleCompleteTask = () => {
    setIsCompleted(true);
    
    Alert.alert(
      '任务已完成！',
      '恭喜你完成了今天的任务',
      [
        {
          text: '确定',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            }
          },
        },
      ]
    );
  };
  
  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // 获取播放速度文本
  const getSpeedText = () => {
    return `${audioSpeed}x`;
  };
  
  // 获取循环模式文本
  const getLoopModeText = () => {
    return loopMode === 'list' ? '列表循环' : '单曲循环';
  };
  
  // 获取循环模式图标
  const getLoopModeIcon = () => {
    return loopMode === 'list' ? 'redo' : 'redo-alt';
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="arrow-left" size={18} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentTask.title}</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 句子内容显示区域 */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>当前句子</Text>
            <Text style={styles.sentenceText}>"{currentTask.sentence}"</Text>
            <Text style={styles.sentenceTranslation}>"{currentTask.translation}"</Text>
          </View>
        </View>
        
        {/* 音频播放器 */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>原音频</Text>
            
            {/* 播放控制区域 */}
            <View style={styles.playbackControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleLoopMode}
                activeOpacity={0.7}
              >
                <FontAwesome6 name={getLoopModeIcon()} size={16} color="#6B7280" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.playButton}
                onPress={handleAudioPlayPause}
                activeOpacity={0.8}
              >
                <FontAwesome6
                  name={isAudioPlaying ? 'pause' : 'play'}
                  size={24}
                  color="#FFFFFF"
                  style={isAudioPlaying ? undefined : styles.playIconAdjustment}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleSpeedControl}
                activeOpacity={0.7}
              >
                <Text style={styles.speedText}>{getSpeedText()}</Text>
              </TouchableOpacity>
            </View>
            
            {/* 进度条 */}
            <View style={styles.progressContainer}>
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatTime(currentAudioTime)}</Text>
                <Text style={styles.timeText}>{formatTime(currentTask.duration)}</Text>
              </View>
              <Slider
                style={styles.progressBar}
                minimumValue={0}
                maximumValue={100}
                value={currentAudioProgress}
                onValueChange={handleProgressChange}
                minimumTrackTintColor="#4F46E5"
                maximumTrackTintColor="#E5E7EB"
              />
            </View>
            
            {/* 播放模式指示 */}
            <View style={styles.modeIndicator}>
              <Text style={styles.modeText}>{getLoopModeText()}</Text>
            </View>
          </View>
        </View>
        
        {/* 录音功能 */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>我的录音</Text>
            
            {/* 录音控制 */}
            <View style={styles.recordingControls}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordButtonActive,
                ]}
                onPress={handleRecording}
                activeOpacity={0.8}
              >
                {isRecording ? (
                  <Text style={styles.recordingTimeText}>
                    {formatTime(recordingTime)}
                  </Text>
                ) : (
                  <FontAwesome6 name="microphone" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            
            {/* 录音状态指示 */}
            <View style={styles.recordingStatus}>
              <Text style={styles.statusText}>
                {isRecording
                  ? '正在录音...'
                  : hasRecordedAudio
                  ? '录音已完成'
                  : '点击开始录音'}
              </Text>
            </View>
            
            {/* 录音播放区域 */}
            {hasRecordedAudio && (
              <View style={styles.recordedAudio}>
                <View style={styles.recordPlaybackControls}>
                  <TouchableOpacity
                    style={styles.recordPlayButton}
                    onPress={handleRecordPlayPause}
                    activeOpacity={0.7}
                  >
                    <FontAwesome6
                      name={isRecordPlaying ? 'pause' : 'play'}
                      size={16}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                  <Text style={styles.recordDurationText}>
                    录音时长: {formatTime(recordingTime)}
                  </Text>
                </View>
                
                {/* 录音进度条 */}
                <Slider
                  style={styles.progressBar}
                  minimumValue={0}
                  maximumValue={100}
                  value={currentRecordProgress}
                  onValueChange={handleRecordProgressChange}
                  minimumTrackTintColor="#06B6D4"
                  maximumTrackTintColor="#E5E7EB"
                />
              </View>
            )}
          </View>
        </View>
        
        {/* 音频对比 */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>音频对比</Text>
            
            <View style={styles.comparisonControls}>
              <TouchableOpacity
                style={styles.compareButton}
                onPress={handleComparison}
                activeOpacity={0.8}
              >
                <FontAwesome6 name="volume-high" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {isComparing ? (
              <View style={styles.comparisonPlaying}>
                <View style={styles.comparisonIndicator}>
                  <FontAwesome6 name="play" size={14} color="#F59E0B" />
                  <Text style={styles.comparisonText}>正在对比播放中...</Text>
                </View>
              </View>
            ) : (
              <View style={styles.comparisonStatus}>
                <Text style={styles.statusText}>同时播放原音频和你的录音</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* 学习提示 */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>学习提示</Text>
            <View style={styles.tipsContent}>
              <View style={styles.tipItem}>
                <View style={[styles.tipIcon, styles.tipIconPrimary]}>
                  <FontAwesome6 name="headphones" size={12} color="#4F46E5" />
                </View>
                <Text style={styles.tipText}>先仔细聆听原音频，注意发音和语调</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipIcon, styles.tipIconSecondary]}>
                  <FontAwesome6 name="microphone" size={12} color="#06B6D4" />
                </View>
                <Text style={styles.tipText}>录音时保持自然的语速和清晰的发音</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipIcon, styles.tipIconTertiary]}>
                  <FontAwesome6 name="scale-balanced" size={12} color="#10B981" />
                </View>
                <Text style={styles.tipText}>通过对比功能检查自己的发音准确性</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* 底部间距 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      {/* 底部完成按钮 */}
      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            isCompleted && styles.completeButtonCompleted,
          ]}
          onPress={handleCompleteTask}
          activeOpacity={0.8}
          disabled={isCompleted}
        >
          <FontAwesome6 name="check" size={16} color="#FFFFFF" />
          <Text style={styles.completeButtonText}>
            {isCompleted ? '任务已完成' : '完成任务'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default TaskDetailScreen;


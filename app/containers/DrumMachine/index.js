import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Tone from 'tone';
import { useInjectSaga } from 'utils/injectSaga';
import { useInjectReducer } from 'utils/injectReducer';

import Slider from 'components/Slider';
import Dropdown from 'components/Dropdown';
import InputText from 'components/InputText';
import H2 from 'components/H2';
import {
  makeSelectStepState,
  makeSelectCurrentStep,
  makeSelectBpm,
  makeSelectPlaying,
  makeSelectVol,
  makeSelectConfig,
  makeSelectTitle,
  makeSelectExportIds,
} from './selectors';
import {
  changeCurrentStep,
  changeVol,
  changeConfig,
  changeTitle,
  loadState,
  changeExportIds,
} from './actions';
import reducer from './reducer';
import saga from './saga';

import BPMInput from './BPMInput';
import PlayButton from './PlayButton';
import SaveButton from './SaveButton';
import ExportButton from './ExportButton';
// import LoadButton from './LoadButton';
import Transport from './Transport';
import TracksContainer from './TracksContainer';

const key = 'drumMachine';

const Container = styled.div`
  max-width: 800px;
  background: #666666;
  border: 2px solid black;
  border-radius: 4px;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
`;

const ControlContainer = styled.div`
  text-align: center;
  width: 130px;
`;

const BPMTextContainer = styled.div`
  display: flex;
  text-align: center;
`;

const BPMText = styled.p`
  padding: 5px;
  margin: 0px;
  margin-left: auto;
  margin-right: auto;
  color: #25ccf7;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
`;

const BPMTextFiller = styled.div`
  margin: 17px 0px;
`;

const Buttons = styled.div`
  display: flex;
  flex: 0 1 auto;
  justify-content: space-between;
  flex-grow: 1;
  flex-wrap: wrap;
  margin-top: auto;
  margin-left: auto;
  margin-right: 18px;
  @media (max-width: 765px) {
    margin-top: 10px;
    margin-left: 18px;
  }
`;

const ControlText = styled.p`
  padding: 5px;
  margin: 0px;
  color: #25ccf7;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
`;

const Option = styled.option`
  color: black;
`;

const configs = {
  config1: {
    tracks: ['Kick', 'Snare', 'HiHat', 'HiHatOpen'],
    samples: {
      Kick: 'https://web-daw.s3.us-east-2.amazonaws.com/kick.wav',
      Snare: 'https://web-daw.s3.us-east-2.amazonaws.com/snare1.wav',
      HiHat: 'https://web-daw.s3.us-east-2.amazonaws.com/hatClosed.wav',
      HiHatOpen: 'https://web-daw.s3.us-east-2.amazonaws.com/hatOpen.wav',
    },
  },
  config2: {
    tracks: ['Kick', 'Snare', 'HiHat', 'HiHatOpen'],
    samples: {
      Kick: 'https://web-daw.s3.us-east-2.amazonaws.com/kick2.wav',
      Snare: 'https://web-daw.s3.us-east-2.amazonaws.com/snareRock.wav',
      HiHat: 'https://web-daw.s3.us-east-2.amazonaws.com/hatClosed2.wav',
      HiHatOpen: 'https://web-daw.s3.us-east-2.amazonaws.com/hatOpen2.wav',
    },
  },
  config3: {
    tracks: ['Kick', 'Snare', 'HiHat', 'HiHatOpen'],
    samples: {
      Kick: 'https://web-daw.s3.us-east-2.amazonaws.com/Kick (2).wav',
      Snare: 'https://web-daw.s3.us-east-2.amazonaws.com/snare3.wav',
      HiHat: 'https://web-daw.s3.us-east-2.amazonaws.com/hatClosed3.wav',
      HiHatOpen: 'https://web-daw.s3.us-east-2.amazonaws.com/hatOpen3.wav',
    },
  },
};

export function DrumMachine({
  setCurrentStepState,
  onChangeVol,
  onChangeConfig,
  onChangeTitle,
  onLoad,
  setExportIds,
  stepState,
  currentStep,
  bpm,
  playing,
  vol,
  config,
  title,
  location,
  exportIds,
}) {
  useInjectReducer({ key, reducer });
  useInjectSaga({ key, saga });

  // Couldn't figure out how to make buffers work in redux
  const [buffers, setBuffers] = useState({});
  const [scheduleId, setScheduleId] = useState(-1);

  // I think these are fine here/don't need to be moved to redux
  const buffersRef = useRef(buffers);
  buffersRef.current = buffers;
  const stepsRef = useRef(stepState);
  stepsRef.current = stepState;
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  useEffect(() => {
    if (location.state) {
      onLoad(location.state.fileData);
    }
  }, []);

  useEffect(
    () => () => {
      if (process.env.NODE_ENV !== 'test') {
        Tone.Transport.stop();
        setCurrentStepState(0);
        Tone.Transport.clear(scheduleId);
        Tone.Transport.cancel();
      }
    },
    [],
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== 'test') {
      const id = Tone.Transport.scheduleRepeat(time => {
        Object.keys(buffersRef.current).forEach(b => {
          const targetStep = stepsRef.current[b][currentStepRef.current];
          const targetBuffer = buffersRef.current[b];

          if (targetStep === 1) {
            targetBuffer.start(time);
          } else if (targetStep === 2) {
            targetBuffer.start();
            targetBuffer.start('+64n');
            targetBuffer.start('+32n');
          }
        });

        // eslint-disable-next-line no-unused-expressions
        currentStepRef.current > 14
          ? setCurrentStepState(0)
          : setCurrentStepState(currentStepRef.current + 1);
      }, '16n');

      setScheduleId(id);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'test') {
      if (parseInt(bpm, 10) >= 30 && parseInt(bpm, 10) <= 300)
        Tone.Transport.bpm.value = bpm;
    }
  }, [bpm]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'test') {
      Tone.Master.volume.value = vol;
    }
  }, [vol]);

  useEffect(() => {
    exportIds.forEach(exportId => {
      Tone.Transport.clear(exportId);
    });
    setExportIds([]);

    if (process.env.NODE_ENV !== 'test') {
      if (playing) {
        Tone.Transport.start();
      } else {
        Tone.Transport.stop();
        setCurrentStepState(0);
      }
    }
  }, [playing]);

  const useWindowSize = () => {
    const isClient = typeof window === 'object';

    const getSize = () => ({
      width: isClient ? window.innerWidth : undefined,
      height: isClient ? window.innerHeight : undefined,
    });

    const [windowSize, setWindowSize] = useState(getSize);

    useEffect(() => {
      if (!isClient) {
        return false;
      }
      function handleResize() {
        setWindowSize(getSize());
      }
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowSize;
  };

  const size = useWindowSize();

  return (
    <Container>
      {size.width < 500 ? (
        <H2 margin="10px 10px" textAlign="center">
          Rotate your device for a better experience.
        </H2>
      ) : (
        <></>
      )}
      <InputText
        value={title}
        onChange={e => onChangeTitle(e)}
        fontSize="1.5em"
        width="auto"
      />
      <BPMTextContainer>
        {parseInt(bpm, 10) < 30 || parseInt(bpm, 10) > '300' ? (
          <BPMText>BPM must be between 30 and 300.</BPMText>
        ) : (
          <BPMTextFiller />
        )}
      </BPMTextContainer>
      <Transport>
        <ControlContainer>
          <ControlText>BPM</ControlText>
          <BPMInput />
        </ControlContainer>
        <ControlContainer>
          <ControlText>Kit</ControlText>
          <Dropdown width="5em" value={config} onChange={onChangeConfig}>
            <Option value="config1">EDM</Option>
            <Option value="config2">Rock</Option>
            <Option value="config3">Trap</Option>
          </Dropdown>
        </ControlContainer>
        <ControlContainer>
          <ControlText>Master Volume</ControlText>
          <Slider
            onChange={onChangeVol}
            min={-60}
            max={0}
            value={vol}
            width={80}
          />
        </ControlContainer>
        <Buttons>
          <PlayButton />
          <SaveButton />
          {/* {localStorage.getItem('jwtToken') ? <LoadButton /> : <></>} */}
          <ExportButton buffers={buffersRef.current} steps={stepsRef.current} />
        </Buttons>
      </Transport>
      <React.Suspense fallback={<p>loading</p>}>
        <TracksContainer
          config={config ? configs[config] : configs.config1}
          currentStep={currentStepRef.current}
          playing={playing}
          setBuffers={setBuffers}
          size={size}
        />
      </React.Suspense>
    </Container>
  );
}

DrumMachine.propTypes = {
  setCurrentStepState: PropTypes.func,
  onChangeVol: PropTypes.func,
  onChangeConfig: PropTypes.func,
  onChangeTitle: PropTypes.func,
  onLoad: PropTypes.func,
  setExportIds: PropTypes.func,
  stepState: PropTypes.object,
  currentStep: PropTypes.number,
  bpm: PropTypes.string,
  playing: PropTypes.bool,
  vol: PropTypes.number,
  config: PropTypes.string,
  title: PropTypes.string,
  location: PropTypes.object,
  exportIds: PropTypes.array,
};

const mapStateToProps = createStructuredSelector({
  stepState: makeSelectStepState(),
  currentStep: makeSelectCurrentStep(),
  bpm: makeSelectBpm(),
  playing: makeSelectPlaying(),
  vol: makeSelectVol(),
  config: makeSelectConfig(),
  title: makeSelectTitle(),
  exportIds: makeSelectExportIds(),
});

const mapDispatchToProps = dispatch => ({
  setCurrentStepState: value => {
    dispatch(changeCurrentStep(value));
  },
  onChangeVol: evt => {
    dispatch(changeVol(evt));
  },
  onChangeConfig: evt => {
    dispatch(changeConfig(evt.target.value));
  },
  onChangeTitle: evt => {
    dispatch(changeTitle(evt.target.value));
  },
  onLoad: value => {
    dispatch(loadState(value));
  },
  setExportIds: value => {
    dispatch(changeExportIds(value));
  },
});

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);

export default compose(withConnect)(DrumMachine);

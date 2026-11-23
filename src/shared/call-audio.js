/** Play the received audio even if the station's video never supplies a frame. */
export function syncCallAudio(player, stream, muted, resume = false) {
  if (!player) return;
  const tracks = stream?.getAudioTracks() || [];
  const previous = player.srcObject?.getAudioTracks() || [];
  const changed = tracks.length !== previous.length || tracks.some((track, index) => track !== previous[index]);
  player.muted = muted;
  if (changed) player.srcObject = tracks.length ? new MediaStream(tracks) : null;
  if (player.srcObject && (changed || (resume && !muted && player.paused))) {
    player.play()?.catch(() => {});
  }
}

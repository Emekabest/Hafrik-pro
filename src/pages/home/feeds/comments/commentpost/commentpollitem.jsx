import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Colors } from '../../../../../theme/colors';

const { width } = Dimensions.get("window");

const CommentPollItem = ({ post, onVote }) => {
	const payload = post?.payload || {};
	const options = payload.options || [];

	const totalVotes = useMemo(() => {
		if (typeof payload.votes === "number") return payload.votes;
		return options.reduce((s, o) => s + (o.votes || 0), 0);
	}, [payload, options]);

	const [selectedId, setSelectedId] = useState(null);
	const [localVotes, setLocalVotes] = useState(() => options.map(o => ({ ...o })));
	const [voted, setVoted] = useState(false);

	const handleVote = (opt) => {
		if (voted) return;
		setVoted(true);
		setSelectedId(opt.id);
		setLocalVotes(prev => prev.map(p => p.id === opt.id ? { ...p, votes: (p.votes || 0) + 1 } : p));
		if (typeof onVote === "function") onVote({ postId: post?.id, pollId: payload.poll_id, optionId: opt.id });
	};

	return (
		<View style={styles.card}>
			<Text style={styles.question}>{post?.text || "Vote"}</Text>

			<View style={styles.options}>
				{localVotes.map((opt) => {
					const votes = opt.votes || 0;
					const pct = totalVotes > 0 ? Math.round((votes / Math.max(totalVotes, 1)) * 100) : 0;
					const isSelected = selectedId === opt.id;
					return (
						<TouchableOpacity
							key={opt.id}
							style={[styles.optionRow, isSelected && styles.optionRowActive]}
							activeOpacity={0.8}
							onPress={() => handleVote(opt)}
						>
							<View style={styles.optionTextWrap}>
								<Text numberOfLines={1} style={[styles.optionText, isSelected && styles.optionTextActive]}>
									{opt.text}
								</Text>
								<Text style={styles.optionCount}>{votes}</Text>
							</View>

							<View style={styles.progressTrack}>
								<View style={[styles.progressFill, { width: `${pct}%` }]} />
							</View>

							<Text style={styles.pctText}>{pct}%</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			<View style={styles.footer}>
				<Text style={styles.total}>Total votes: {totalVotes}</Text>
				<Text style={styles.created}>{post?.created}</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		width,
		backgroundColor: Colors.white,
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderTopWidth: 1,
		borderTopColor: Colors.neutral180,
	},
	question: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 10,
		color: Colors.neutral900,
	},
	options: {
		gap: 8,
	},
	optionRow: {
		paddingVertical: 10,
		paddingHorizontal: 10,
		borderRadius: 8,
		backgroundColor: Colors.neutral125,
	},
	optionRowActive: {
		backgroundColor: Colors.infoSurface,
	},
	optionTextWrap: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	optionText: {
		fontSize: 14,
		color: Colors.neutral900,
		flex: 1,
		marginRight: 8,
	},
	optionTextActive: {
		fontWeight: "700",
		color: Colors.linkBlue,
	},
	optionCount: {
		fontSize: 13,
		color: Colors.neutral500,
		minWidth: 28,
		textAlign: "right",
	},
	progressTrack: {
		height: 8,
		backgroundColor: Colors.neutral160,
		borderRadius: 6,
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		backgroundColor: Colors.linkBlue,
	},
	pctText: {
		marginTop: 6,
		fontSize: 12,
		color: Colors.neutral500,
		textAlign: "right",
	},
	footer: {
		marginTop: 10,
		flexDirection: "row",
		justifyContent: "space-between",
	},
	total: {
		fontSize: 12,
		color: Colors.neutral500,
	},
	created: {
		fontSize: 12,
		color: Colors.neutral350,
	},
});

export default CommentPollItem;